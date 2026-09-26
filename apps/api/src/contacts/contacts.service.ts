import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { deriveDisplayName, sortKey } from './contact-names';
import type {
  ContactInputDto,
  ListContactsQueryDto,
  Order,
  Sort,
} from './dto/contact.dto';
import { normalisePhone, phoneSearchDigits } from './phone';

/** Days a contact stays in the trash before it is deleted for good (ADR 0005). */
export const TRASH_DAYS = 30;
/** How often, at most, a process checks for expired trash. */
const PURGE_INTERVAL_MS = 60 * 60 * 1000;
/** "Last used" is written at most this often per contact (ADR 0007). */
const LAST_USED_THROTTLE_SECONDS = 60;
const DEFAULT_PAGE_SIZE = 50;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PhoneView {
  label: string | null;
  raw: string;
  e164: string | null;
}

export interface EmailView {
  label: string | null;
  address: string;
}

export interface ContactSummary {
  id: string;
  displayName: string;
  organization: string | null;
  primaryPhone: PhoneView | null;
  primaryEmail: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
}

export interface ContactDetail extends Omit<
  ContactSummary,
  'primaryPhone' | 'primaryEmail'
> {
  givenName: string | null;
  familyName: string | null;
  nickname: string | null;
  jobTitle: string | null;
  notes: string | null;
  birthday: string | null;
  updatedAt: string;
  /** When a trashed contact will be deleted for good. */
  purgeAt: string | null;
  phones: PhoneView[];
  emails: EmailView[];
}

export interface ContactPage {
  items: ContactSummary[];
  total: number;
  page: number;
  pageSize: number;
}

const detailInclude = {
  phoneNumbers: { orderBy: { position: 'asc' } },
  emailAddresses: { orderBy: { position: 'asc' } },
} satisfies Prisma.ContactInclude;

type ContactWithChildren = Prisma.ContactGetPayload<{
  include: typeof detailInclude;
}>;

/** Escapes LIKE wildcards so a search for "50%" means those characters. */
const likeEscape = (s: string) => s.replace(/[\\%_]/g, '\\$&');

const iso = (d: Date | null) => (d ? d.toISOString() : null);

/**
 * Contacts, always scoped to their owner (ADR 0004): every query carries
 * `ownerId`, and another owner's contact is indistinguishable from one that
 * does not exist (404).
 */
@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);
  private lastPurge = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(ownerId: string, q: ListContactsQueryDto): Promise<ContactPage> {
    await this.purgeExpiredTrashIfDue();
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = this.listWhere(ownerId, q);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.contact.count({ where }),
      this.prisma.contact.findMany({
        where,
        orderBy: orderBy(q.sort ?? 'name', q.order),
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          phoneNumbers: { where: { position: 0 } },
          emailAddresses: { where: { position: 0 } },
        },
      }),
    ]);
    return {
      items: rows.map((c) => ({
        ...summaryFields(c),
        primaryPhone: c.phoneNumbers[0] ? phoneView(c.phoneNumbers[0]) : null,
        primaryEmail: c.emailAddresses[0]?.address ?? null,
      })),
      total,
      page,
      pageSize,
    };
  }

  /** How many contacts are in each list (for the profile page). */
  async stats(
    ownerId: string,
  ): Promise<{ active: number; archived: number; trash: number }> {
    const [active, archived, trash] = await this.prisma.$transaction([
      this.prisma.contact.count({
        where: { ownerId, deletedAt: null, archivedAt: null },
      }),
      this.prisma.contact.count({
        where: { ownerId, deletedAt: null, archivedAt: { not: null } },
      }),
      this.prisma.contact.count({
        where: { ownerId, deletedAt: { not: null } },
      }),
    ]);
    return { active, archived, trash };
  }

  async get(ownerId: string, id: string): Promise<ContactDetail> {
    const c = await this.prisma.contact.findFirst({
      where: { id, ownerId },
      include: detailInclude,
    });
    if (!c) throw new NotFoundException('Contact not found.');
    return detailView(c);
  }

  async create(ownerId: string, dto: ContactInputDto): Promise<ContactDetail> {
    const data = contactData(dto);
    const c = await this.prisma.$transaction(async (tx) => {
      const created = await tx.contact.create({
        data: {
          ...data,
          ownerId,
          phoneNumbers: { create: phoneRows(dto) },
          emailAddresses: { create: emailRows(dto) },
        },
        include: detailInclude,
      });
      await this.audit.record(
        'contact.created',
        {
          actorUserId: ownerId,
          entityType: 'contact',
          entityId: created.id,
        },
        tx,
      );
      return created;
    });
    return detailView(c);
  }

  /** Saves the whole contact; the phone and email lists are replaced. */
  async update(
    ownerId: string,
    id: string,
    dto: ContactInputDto,
  ): Promise<ContactDetail> {
    const data = contactData(dto);
    const c = await this.prisma.$transaction(async (tx) => {
      await this.requireEditable(tx, ownerId, id);
      await tx.phoneNumber.deleteMany({ where: { contactId: id, ownerId } });
      await tx.emailAddress.deleteMany({ where: { contactId: id, ownerId } });
      const updated = await tx.contact.update({
        where: { id_ownerId: { id, ownerId } },
        data: {
          ...data,
          phoneNumbers: { create: phoneRows(dto) },
          emailAddresses: { create: emailRows(dto) },
        },
        include: detailInclude,
      });
      await this.audit.record(
        'contact.updated',
        { actorUserId: ownerId, entityType: 'contact', entityId: id },
        tx,
      );
      return updated;
    });
    return detailView(c);
  }

  archive(ownerId: string, id: string): Promise<void> {
    return this.transition(ownerId, id, 'contact.archived', {
      where: { deletedAt: null },
      data: { archivedAt: new Date() },
      conflict: 'A contact in the trash cannot be archived.',
    });
  }

  unarchive(ownerId: string, id: string): Promise<void> {
    return this.transition(ownerId, id, 'contact.unarchived', {
      where: { deletedAt: null },
      data: { archivedAt: null },
      conflict: 'A contact in the trash cannot be unarchived.',
    });
  }

  /** Moves a contact to the trash (restorable for TRASH_DAYS). */
  trash(ownerId: string, id: string): Promise<void> {
    return this.transition(ownerId, id, 'contact.trashed', {
      where: { deletedAt: null },
      data: { deletedAt: new Date() },
      conflict: 'The contact is already in the trash.',
    });
  }

  restore(ownerId: string, id: string): Promise<void> {
    return this.transition(ownerId, id, 'contact.restored', {
      where: { deletedAt: { not: null } },
      data: { deletedAt: null },
      conflict: 'The contact is not in the trash.',
    });
  }

  /** Deletes a trashed contact for good, with its numbers and emails. */
  async deletePermanently(ownerId: string, id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const c = await tx.contact.findFirst({
        where: { id, ownerId },
        select: { deletedAt: true },
      });
      if (!c) throw new NotFoundException('Contact not found.');
      if (!c.deletedAt) {
        throw new ConflictException(
          'Move the contact to the trash before deleting it for good.',
        );
      }
      await tx.contact.delete({ where: { id_ownerId: { id, ownerId } } });
      await this.audit.record(
        'contact.deleted',
        { actorUserId: ownerId, entityType: 'contact', entityId: id },
        tx,
      );
    });
  }

  async emptyTrash(ownerId: string): Promise<{ deleted: number }> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.contact.deleteMany({
        where: { ownerId, deletedAt: { not: null } },
      });
      await this.audit.record(
        'contact.trash_emptied',
        { actorUserId: ownerId, metadata: { count } },
        tx,
      );
      return { deleted: count };
    });
  }

  /**
   * Records that the owner opened the contact (ADR 0007). At most one write
   * per contact per minute, and it does not count as an edit: raw SQL, so
   * `updated_at` is left alone. Silently a no-op for trashed contacts.
   */
  async markUsed(ownerId: string, id: string): Promise<void> {
    const n = await this.prisma.$executeRaw`
      UPDATE contacts SET last_used_at = now()
      WHERE id = ${id}::uuid AND owner_id = ${ownerId}::uuid
        AND deleted_at IS NULL
        AND (last_used_at IS NULL
             OR last_used_at < now() - make_interval(secs => ${LAST_USED_THROTTLE_SECONDS}))`;
    if (n === 0) {
      const exists = await this.prisma.contact.count({
        where: { id, ownerId },
      });
      if (!exists) throw new NotFoundException('Contact not found.');
    }
  }

  /**
   * Hard-deletes contacts that have been in the trash longer than
   * TRASH_DAYS. Render's free plan has no scheduler, so this runs on
   * ordinary traffic, at most once an hour per process.
   */
  async purgeExpiredTrashIfDue(now = Date.now()): Promise<void> {
    if (now - this.lastPurge < PURGE_INTERVAL_MS) return;
    this.lastPurge = now;
    try {
      await this.purgeExpiredTrash(new Date(now));
    } catch (err) {
      // Never fail the user's request over housekeeping; retry next hour.
      this.logger.error('Trash purge failed', err as Error);
    }
  }

  async purgeExpiredTrash(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - TRASH_DAYS * DAY_MS);
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.contact.deleteMany({
        where: { deletedAt: { lt: cutoff } },
      });
      if (count > 0) {
        await this.audit.record(
          'contact.trash_purged',
          { actorUserId: null, metadata: { count } },
          tx,
        );
      }
      return count;
    });
  }

  private listWhere(
    ownerId: string,
    q: ListContactsQueryDto,
  ): Prisma.ContactWhereInput {
    const view = q.view ?? 'active';
    const where: Prisma.ContactWhereInput = {
      ownerId,
      ...(view === 'trash'
        ? { deletedAt: { not: null } }
        : view === 'archived'
          ? { deletedAt: null, archivedAt: { not: null } }
          : { deletedAt: null, archivedAt: null }),
    };
    if (!q.q) return where;

    const text = likeEscape(q.q);
    const contains = { contains: text, mode: 'insensitive' as const };
    const or: Prisma.ContactWhereInput[] = [
      { displayName: contains },
      { givenName: contains },
      { familyName: contains },
      { nickname: contains },
      { organization: contains },
      {
        emailAddresses: {
          some: { address: { contains: text.toLowerCase() } },
        },
      },
    ];
    for (const d of phoneSearchDigits(q.q)) {
      or.push({
        phoneNumbers: {
          some: {
            OR: [{ digits: { contains: d } }, { e164: { contains: d } }],
          },
        },
      });
    }
    return { ...where, OR: or };
  }

  /** Not found for other owners; conflict for a contact in the trash. */
  private async requireEditable(
    tx: Prisma.TransactionClient,
    ownerId: string,
    id: string,
  ): Promise<void> {
    const c = await tx.contact.findFirst({
      where: { id, ownerId },
      select: { deletedAt: true },
    });
    if (!c) throw new NotFoundException('Contact not found.');
    if (c.deletedAt) {
      throw new ConflictException('Restore the contact from the trash first.');
    }
  }

  /** A state change guarded by a condition, audited in one transaction. */
  private async transition(
    ownerId: string,
    id: string,
    action:
      | 'contact.archived'
      | 'contact.unarchived'
      | 'contact.trashed'
      | 'contact.restored',
    change: {
      where: Prisma.ContactWhereInput;
      data: Prisma.ContactUpdateManyMutationInput;
      conflict: string;
    },
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.contact.updateMany({
        where: { id, ownerId, ...change.where },
        data: change.data,
      });
      if (count === 0) {
        const exists = await tx.contact.count({ where: { id, ownerId } });
        if (!exists) throw new NotFoundException('Contact not found.');
        throw new ConflictException(change.conflict);
      }
      await this.audit.record(
        action,
        { actorUserId: ownerId, entityType: 'contact', entityId: id },
        tx,
      );
    });
  }
}

function orderBy(
  sort: Sort,
  order?: Order,
): Prisma.ContactOrderByWithRelationInput[] {
  const dir = order ?? (sort === 'name' ? 'asc' : 'desc');
  switch (sort) {
    case 'created':
      return [{ createdAt: dir }, { id: dir }];
    case 'lastUsed':
      // Never-opened contacts go last either way, then A–Z.
      return [
        { lastUsedAt: { sort: dir, nulls: 'last' } },
        { sortName: 'asc' },
        { id: 'asc' },
      ];
    default:
      return [{ sortName: dir }, { id: dir }];
  }
}

/** Scalar fields for create/update, with the derived names. */
function contactData(dto: ContactInputDto) {
  const displayName = deriveDisplayName({
    ...dto,
    firstPhone: dto.phones?.[0]?.raw,
    firstEmail: dto.emails?.[0]?.address,
  });
  if (!displayName) {
    throw new BadRequestException(
      'Give the contact a name, organisation, phone number or email.',
    );
  }
  return {
    displayName,
    sortName: sortKey(displayName),
    givenName: dto.givenName ?? null,
    familyName: dto.familyName ?? null,
    nickname: dto.nickname ?? null,
    organization: dto.organization ?? null,
    jobTitle: dto.jobTitle ?? null,
    notes: dto.notes ?? null,
    birthday: dto.birthday ? parseBirthday(dto.birthday) : null,
  };
}

/** A real calendar date between 1900 and today. */
function parseBirthday(s: string): Date {
  const d = new Date(`${s}T00:00:00.000Z`);
  if (
    Number.isNaN(d.getTime()) ||
    d.toISOString().slice(0, 10) !== s ||
    d.getUTCFullYear() < 1900 ||
    d.getTime() > Date.now()
  ) {
    throw new BadRequestException(
      'birthday must be a real date between 1900 and today',
    );
  }
  return d;
}

function phoneRows(dto: ContactInputDto) {
  return (dto.phones ?? []).map((p, position) => ({
    ...normalisePhone(p.raw),
    label: p.label ?? null,
    position,
  }));
}

function emailRows(dto: ContactInputDto) {
  return (dto.emails ?? []).map((e, position) => ({
    address: e.address,
    label: e.label ?? null,
    position,
  }));
}

function phoneView(p: {
  label: string | null;
  raw: string;
  e164: string | null;
}): PhoneView {
  return { label: p.label, raw: p.raw, e164: p.e164 };
}

function summaryFields(
  c: ContactWithChildren | Prisma.ContactGetPayload<object>,
) {
  return {
    id: c.id,
    displayName: c.displayName,
    organization: c.organization,
    createdAt: c.createdAt.toISOString(),
    lastUsedAt: iso(c.lastUsedAt),
    archivedAt: iso(c.archivedAt),
    deletedAt: iso(c.deletedAt),
  };
}

function detailView(c: ContactWithChildren): ContactDetail {
  return {
    ...summaryFields(c),
    givenName: c.givenName,
    familyName: c.familyName,
    nickname: c.nickname,
    jobTitle: c.jobTitle,
    notes: c.notes,
    birthday: c.birthday ? c.birthday.toISOString().slice(0, 10) : null,
    updatedAt: c.updatedAt.toISOString(),
    purgeAt: c.deletedAt
      ? new Date(c.deletedAt.getTime() + TRASH_DAYS * DAY_MS).toISOString()
      : null,
    phones: c.phoneNumbers.map(phoneView),
    emails: c.emailAddresses.map((e) => ({
      label: e.label,
      address: e.address,
    })),
  };
}
