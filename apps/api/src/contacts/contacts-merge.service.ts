import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { sortKey } from './contact-names';
import {
  type ContactDetail,
  type ContactSummary,
  ContactsService,
} from './contacts.service';
import { type DuplicateReason, findDuplicates, pairKey } from './duplicates';
import {
  type Conflict,
  conflicts,
  type MergeChoices,
  mergeContacts,
  type MergeSide,
} from './merge';

export interface DuplicateView {
  a: ContactSummary;
  b: ContactSummary;
  reasons: DuplicateReason[];
  confidence: 'high' | 'medium';
}

export interface MergePreview {
  keep: ContactDetail;
  merge: ContactDetail;
  conflicts: Conflict[];
  /** What the kept contact will look like with the default choices. */
  result: MergeSide;
}

const sideInclude = {
  phoneNumbers: { orderBy: { position: 'asc' } },
  emailAddresses: { orderBy: { position: 'asc' } },
} satisfies Prisma.ContactInclude;

type ContactRow = Prisma.ContactGetPayload<{ include: typeof sideInclude }>;

function toSide(c: ContactRow): MergeSide {
  return {
    displayName: c.displayName,
    givenName: c.givenName,
    familyName: c.familyName,
    nickname: c.nickname,
    organization: c.organization,
    jobTitle: c.jobTitle,
    birthday: c.birthday ? c.birthday.toISOString().slice(0, 10) : null,
    notes: c.notes,
    phones: c.phoneNumbers.map((p) => ({
      raw: p.raw,
      e164: p.e164,
      digits: p.digits,
      label: p.label,
    })),
    emails: c.emailAddresses.map((e) => ({
      address: e.address,
      label: e.label,
    })),
  };
}

/**
 * Duplicate review and safe merge (Phase 5b; ADR 0005). Nothing is merged
 * automatically; every merge is one transaction, audited by id, and can be
 * undone while the merged-away contact is still in the trash (30 days).
 */
@Injectable()
export class ContactsMergeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly contacts: ContactsService,
  ) {}

  async duplicates(
    ownerId: string,
  ): Promise<{ pairs: DuplicateView[]; total: number }> {
    const [rows, dismissals] = await Promise.all([
      this.prisma.contact.findMany({
        where: { ownerId, deletedAt: null },
        include: {
          phoneNumbers: { orderBy: { position: 'asc' } },
          emailAddresses: { orderBy: { position: 'asc' } },
        },
      }),
      this.prisma.duplicateDismissal.findMany({
        where: { ownerId },
        select: { contactAId: true, contactBId: true },
      }),
    ]);
    const pairs = findDuplicates(
      rows.map((r) => ({
        id: r.id,
        sortName: r.sortName,
        phones: r.phoneNumbers,
        emails: r.emailAddresses.map((e) => e.address),
      })),
      new Set(dismissals.map((d) => pairKey(d.contactAId, d.contactBId))),
    );
    const byId = new Map(rows.map((r) => [r.id, r]));
    const summary = (id: string): ContactSummary => {
      const r = byId.get(id)!;
      return {
        id: r.id,
        displayName: r.displayName,
        organization: r.organization,
        primaryPhone: r.phoneNumbers[0]
          ? {
              label: r.phoneNumbers[0].label,
              raw: r.phoneNumbers[0].raw,
              e164: r.phoneNumbers[0].e164,
            }
          : null,
        primaryEmail: r.emailAddresses[0]?.address ?? null,
        createdAt: r.createdAt.toISOString(),
        lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
        archivedAt: r.archivedAt?.toISOString() ?? null,
        deletedAt: null,
      };
    };
    return {
      pairs: pairs.map((p) => ({
        a: summary(p.aId),
        b: summary(p.bId),
        reasons: p.reasons,
        confidence: p.confidence,
      })),
      total: pairs.length,
    };
  }

  /** "Not the same person": never suggest this pair again. */
  async dismiss(ownerId: string, x: string, y: string): Promise<void> {
    if (x === y)
      throw new BadRequestException('Choose two different contacts.');
    const [contactAId, contactBId] = x < y ? [x, y] : [y, x];
    const found = await this.prisma.contact.count({
      where: { ownerId, id: { in: [contactAId, contactBId] } },
    });
    if (found !== 2) throw new NotFoundException('Contact not found.');
    await this.prisma.$transaction(async (tx) => {
      await tx.duplicateDismissal.upsert({
        where: {
          ownerId_contactAId_contactBId: { ownerId, contactAId, contactBId },
        },
        create: { ownerId, contactAId, contactBId },
        update: {},
      });
      await this.audit.record(
        'contact.duplicate_dismissed',
        { actorUserId: ownerId, entityType: 'contact', entityId: contactAId },
        tx,
      );
    });
  }

  async preview(
    ownerId: string,
    keepId: string,
    mergeId: string,
  ): Promise<MergePreview> {
    const [keep, merge] = await this.loadPair(
      this.prisma,
      ownerId,
      keepId,
      mergeId,
    );
    return {
      keep: await this.contacts.get(ownerId, keepId),
      merge: await this.contacts.get(ownerId, mergeId),
      conflicts: conflicts(toSide(keep), toSide(merge)),
      result: mergeContacts(toSide(keep), toSide(merge)),
    };
  }

  /**
   * Merges `mergeId` into `keepId`: one transaction; the survivor's previous
   * state is saved; the merged-away contact goes to the trash.
   */
  async merge(
    ownerId: string,
    keepId: string,
    mergeId: string,
    choices: MergeChoices,
  ): Promise<{ survivorId: string; mergeRecordId: string }> {
    return this.prisma.$transaction(async (tx) => {
      const [keep, other] = await this.loadPair(tx, ownerId, keepId, mergeId);
      const before = toSide(keep);
      const after = mergeContacts(before, toSide(other), choices);

      await tx.phoneNumber.deleteMany({
        where: { contactId: keepId, ownerId },
      });
      await tx.emailAddress.deleteMany({
        where: { contactId: keepId, ownerId },
      });
      await tx.contact.update({
        where: { id_ownerId: { id: keepId, ownerId } },
        data: {
          ...scalarData(after),
          // "Last used" and "date saved" take the wider span of the two.
          lastUsedAt: latest(keep.lastUsedAt, other.lastUsedAt),
          createdAt:
            other.createdAt < keep.createdAt ? other.createdAt : keep.createdAt,
          phoneNumbers: { create: after.phones.map(phoneRow) },
          emailAddresses: { create: after.emails.map(emailRow) },
        },
      });
      await tx.contact.update({
        where: { id_ownerId: { id: mergeId, ownerId } },
        data: { deletedAt: new Date() },
      });
      const record = await tx.contactMerge.create({
        data: {
          ownerId,
          survivorId: keepId,
          mergedId: mergeId,
          survivorBefore: {
            ...before,
            createdAt: keep.createdAt.toISOString(),
            lastUsedAt: keep.lastUsedAt?.toISOString() ?? null,
          },
        },
      });
      await this.audit.record(
        'contact.merged',
        {
          actorUserId: ownerId,
          entityType: 'contact',
          entityId: keepId,
          metadata: { mergedContactId: mergeId, mergeId: record.id },
        },
        tx,
      );
      return { survivorId: keepId, mergeRecordId: record.id };
    });
  }

  /** Puts both contacts back exactly as they were before the merge. */
  async undo(
    ownerId: string,
    mergeRecordId: string,
  ): Promise<{ survivorId: string; mergedId: string }> {
    return this.prisma.$transaction(async (tx) => {
      const m = await tx.contactMerge.findFirst({
        where: { id: mergeRecordId, ownerId },
        include: {
          merged: { select: { deletedAt: true } },
          survivor: { select: { deletedAt: true } },
        },
      });
      if (!m) throw new NotFoundException('That merge no longer exists.');
      if (m.undoneAt)
        throw new ConflictException('That merge was already undone.');
      if (!m.merged.deletedAt) {
        throw new ConflictException(
          'The merged contact was restored from the trash, so this merge can no longer be undone.',
        );
      }
      if (m.survivor.deletedAt) {
        throw new ConflictException(
          'Restore the kept contact from the trash first.',
        );
      }
      const before = m.survivorBefore as unknown as MergeSide & {
        createdAt: string;
        lastUsedAt: string | null;
      };
      await tx.phoneNumber.deleteMany({
        where: { contactId: m.survivorId, ownerId },
      });
      await tx.emailAddress.deleteMany({
        where: { contactId: m.survivorId, ownerId },
      });
      await tx.contact.update({
        where: { id_ownerId: { id: m.survivorId, ownerId } },
        data: {
          ...scalarData(before),
          createdAt: new Date(before.createdAt),
          lastUsedAt: before.lastUsedAt ? new Date(before.lastUsedAt) : null,
          phoneNumbers: { create: before.phones.map(phoneRow) },
          emailAddresses: { create: before.emails.map(emailRow) },
        },
      });
      await tx.contact.update({
        where: { id_ownerId: { id: m.mergedId, ownerId } },
        data: { deletedAt: null },
      });
      await tx.contactMerge.update({
        where: { id: m.id },
        data: { undoneAt: new Date() },
      });
      await this.audit.record(
        'contact.merge_undone',
        {
          actorUserId: ownerId,
          entityType: 'contact',
          entityId: m.survivorId,
          metadata: { mergedContactId: m.mergedId, mergeId: m.id },
        },
        tx,
      );
      return { survivorId: m.survivorId, mergedId: m.mergedId };
    });
  }

  /** Merges into this contact that can still be undone, newest first. */
  async undoableMerges(
    ownerId: string,
    survivorId: string,
  ): Promise<{ id: string; mergedName: string; createdAt: string }[]> {
    const rows = await this.prisma.contactMerge.findMany({
      where: {
        ownerId,
        survivorId,
        undoneAt: null,
        merged: { deletedAt: { not: null } },
      },
      orderBy: { createdAt: 'desc' },
      include: { merged: { select: { displayName: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      mergedName: r.merged.displayName,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  private async loadPair(
    db: Prisma.TransactionClient | PrismaService,
    ownerId: string,
    keepId: string,
    mergeId: string,
  ): Promise<[ContactRow, ContactRow]> {
    if (keepId === mergeId) {
      throw new BadRequestException('Choose two different contacts.');
    }
    const rows = await db.contact.findMany({
      where: { ownerId, id: { in: [keepId, mergeId] } },
      include: sideInclude,
    });
    const keep = rows.find((r) => r.id === keepId);
    const merge = rows.find((r) => r.id === mergeId);
    if (!keep || !merge) throw new NotFoundException('Contact not found.');
    if (keep.deletedAt || merge.deletedAt) {
      throw new ConflictException(
        'Restore both contacts from the trash first.',
      );
    }
    return [keep, merge];
  }
}

function scalarData(s: MergeSide) {
  return {
    displayName: s.displayName,
    sortName: sortKey(s.displayName),
    givenName: s.givenName,
    familyName: s.familyName,
    nickname: s.nickname,
    organization: s.organization,
    jobTitle: s.jobTitle,
    notes: s.notes,
    birthday: s.birthday ? new Date(`${s.birthday}T00:00:00Z`) : null,
  };
}

const phoneRow = (p: MergeSide['phones'][number], position: number) => ({
  raw: p.raw,
  e164: p.e164,
  digits: p.digits,
  label: p.label,
  position,
});

const emailRow = (e: MergeSide['emails'][number], position: number) => ({
  address: e.address,
  label: e.label,
  position,
});

function latest(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}
