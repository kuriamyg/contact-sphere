import { BadRequestException, Injectable } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { FREE_GROUPS, Plans } from '../billing/plans.service';
import { normaliseTags, searchText, sortKey } from '../contacts/contact-names';
import { normalisePhone } from '../contacts/phone';
import { uuidv7 } from '../contacts/uuid';
import { PrismaService } from '../prisma/prisma.service';
import { ordered } from '../relationships/kinds';
import {
  type Archive,
  ARCHIVE_FORMAT,
  ARCHIVE_VERSION,
  type ArchiveContact,
  ArchiveError,
  readArchive,
} from './archive';

const MAX_MEMBERS = 2_000;

/** What a restore will do (preview) or did. Counts only. */
export interface RestorePlan {
  contacts: {
    inBackup: number;
    toAdd: number;
    alreadySaved: number;
    repeated: number;
  };
  groups: {
    inBackup: number;
    toAdd: number;
    toUpdate: number;
    overLimit: number;
  };
  memberships: number;
  followUps: number;
  relationships: number;
  /** Entries the file had that could not be read. */
  unreadable: number;
}

interface Known {
  id: string;
  phones: Set<string>;
  emails: Set<string>;
}

type Phone = ReturnType<typeof normalisePhone>;
const phoneKey = (p: { e164: string | null; digits: string }) =>
  p.e164 ?? p.digits;

/** Every number and email of `k` is already on one contact of the same name. */
function match(index: Map<string, Known[]>, key: string, k: Omit<Known, 'id'>) {
  return (index.get(key) ?? []).find(
    (x) =>
      [...k.phones].every((p) => x.phones.has(p)) &&
      [...k.emails].every((e) => x.emails.has(e)),
  );
}

function remember(index: Map<string, Known[]>, key: string, k: Known) {
  index.set(key, [...(index.get(key) ?? []), k]);
}

interface NewContact {
  src: ArchiveContact;
  id: string;
  sortName: string;
  phones: Phone[];
}

/**
 * Encrypted backups (ADR 0009, C2). The API hands the owner their data as
 * JSON — the browser encrypts it — and on restore reads the decrypted JSON
 * back. Restore never overwrites and never deletes: it adds contacts that
 * are not already saved, adds missing groups and members, and adds the
 * follow-ups of contacts it created. Audited by counts only.
 */
@Injectable()
export class BackupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly plans: Plans,
  ) {}

  async export(ownerId: string, now = new Date()): Promise<Archive> {
    const [contacts, groups, followUps, relationships] = await Promise.all([
      this.prisma.contact.findMany({
        where: { ownerId, deletedAt: null },
        orderBy: [{ sortName: 'asc' }, { id: 'asc' }],
        include: {
          phoneNumbers: { orderBy: { position: 'asc' } },
          emailAddresses: { orderBy: { position: 'asc' } },
        },
      }),
      this.prisma.group.findMany({
        where: { ownerId },
        orderBy: { nameKey: 'asc' },
        include: {
          members: {
            where: { contact: { deletedAt: null } },
            select: { contactId: true, role: true },
          },
        },
      }),
      this.prisma.followUp.findMany({
        where: { ownerId, contact: { deletedAt: null } },
        orderBy: { dueOn: 'asc' },
        take: 10_000,
        select: { contactId: true, dueOn: true, note: true, doneAt: true },
      }),
      this.prisma.relationship.findMany({
        where: {
          ownerId,
          from: { deletedAt: null },
          to: { deletedAt: null },
        },
        orderBy: { createdAt: 'asc' },
        take: 20_000,
        select: { fromId: true, toId: true, kind: true, label: true },
      }),
    ]);
    const archive: Archive = {
      format: ARCHIVE_FORMAT,
      version: ARCHIVE_VERSION,
      exportedAt: now.toISOString(),
      contacts: contacts.map((c) => ({
        id: c.id,
        displayName: c.displayName,
        givenName: c.givenName,
        familyName: c.familyName,
        nickname: c.nickname,
        organization: c.organization,
        jobTitle: c.jobTitle,
        notes: c.notes,
        birthday: c.birthday ? c.birthday.toISOString().slice(0, 10) : null,
        area: c.area,
        metThrough: c.metThrough,
        tags: c.tags,
        keepInTouchDays: c.keepInTouchDays,
        lastContactedAt: c.lastContactedAt?.toISOString() ?? null,
        archived: c.archivedAt !== null,
        phones: c.phoneNumbers.map((p) => ({ raw: p.raw, label: p.label })),
        emails: c.emailAddresses.map((e) => ({
          address: e.address,
          label: e.label,
        })),
      })),
      groups: groups.map((g) => ({
        name: g.name,
        kind: g.kind as Archive['groups'][number]['kind'],
        description: g.description,
        members: g.members,
      })),
      followUps: followUps.map((f) => ({
        contactId: f.contactId,
        dueOn: f.dueOn.toISOString().slice(0, 10),
        note: f.note,
        done: f.doneAt !== null,
      })),
      relationships: relationships.map((r) => ({
        ...r,
        kind: r.kind as Archive['relationships'][number]['kind'],
      })),
    };
    await this.prisma.user.update({
      where: { id: ownerId },
      data: { lastBackupAt: now },
    });
    await this.audit.record('backup.exported', {
      actorUserId: ownerId,
      metadata: {
        contacts: archive.contacts.length,
        groups: archive.groups.length,
        follow_ups: archive.followUps.length,
        relationships: archive.relationships.length,
      },
    });
    return archive;
  }

  async preview(ownerId: string, input: unknown): Promise<RestorePlan> {
    return (await this.plan(ownerId, input)).plan;
  }

  async restore(ownerId: string, input: unknown): Promise<RestorePlan> {
    const work = await this.plan(ownerId, input);
    const {
      plan,
      created,
      idOf,
      newGroups,
      groupUpdates,
      followUps,
      relationships,
    } = work;
    const now = new Date();
    await this.prisma.$transaction(
      async (tx) => {
        if (created.length > 0) {
          await tx.contact.createMany({
            data: created.map(({ src, id, sortName }) => {
              const tags = normaliseTags(src.tags);
              const lastContacted = src.lastContactedAt
                ? new Date(src.lastContactedAt)
                : null;
              return {
                id,
                ownerId,
                displayName: src.displayName,
                sortName,
                searchText: searchText({ ...src, tags }),
                tags,
                givenName: src.givenName,
                familyName: src.familyName,
                nickname: src.nickname,
                organization: src.organization,
                jobTitle: src.jobTitle,
                notes: src.notes,
                birthday: src.birthday
                  ? new Date(`${src.birthday}T00:00:00Z`)
                  : null,
                area: src.area,
                metThrough: src.metThrough,
                keepInTouchDays: src.keepInTouchDays,
                lastContactedAt:
                  lastContacted && lastContacted <= now ? lastContacted : null,
                archivedAt: src.archived ? now : null,
                createdAt: now,
                updatedAt: now,
              };
            }),
          });
          await tx.phoneNumber.createMany({
            data: created.flatMap((c) =>
              c.phones.map((p, position) => ({
                ownerId,
                contactId: c.id,
                raw: p.raw,
                e164: p.e164,
                digits: p.digits,
                label: c.src.phones[position]?.label ?? null,
                position,
              })),
            ),
          });
          await tx.emailAddress.createMany({
            data: created.flatMap((c) =>
              c.src.emails.map((e, position) => ({
                ownerId,
                contactId: c.id,
                address: e.address,
                label: e.label,
                position,
              })),
            ),
          });
        }
        for (const g of newGroups) {
          await tx.group.create({
            data: {
              id: g.id,
              ownerId,
              name: g.name,
              nameKey: g.name.toLowerCase(),
              kind: g.kind,
              description: g.description,
            },
          });
        }
        const members = [...newGroups, ...groupUpdates].flatMap((g) =>
          g.members.map((m) => ({
            groupId: g.id,
            contactId: m.contactId,
            ownerId,
            role: m.role,
          })),
        );
        if (members.length > 0) {
          await tx.groupMember.createMany({
            data: members,
            skipDuplicates: true,
          });
        }
        if (followUps.length > 0) {
          await tx.followUp.createMany({
            data: followUps.map((f) => ({
              ownerId,
              contactId: idOf.get(f.contactId) as string,
              dueOn: new Date(`${f.dueOn}T00:00:00Z`),
              note: f.note,
              doneAt: f.done ? now : null,
            })),
          });
        }
        if (relationships.length > 0) {
          await tx.relationship.createMany({
            data: relationships.map((r) => ({ ownerId, ...r })),
            // Already linked the same way: left as it is.
            skipDuplicates: true,
          });
        }
        await this.audit.record(
          'backup.restored',
          {
            actorUserId: ownerId,
            metadata: {
              contacts_added: plan.contacts.toAdd,
              contacts_already_saved: plan.contacts.alreadySaved,
              groups_added: plan.groups.toAdd,
              groups_updated: plan.groups.toUpdate,
              follow_ups_added: plan.followUps,
              relationships_added: plan.relationships,
            },
          },
          tx,
        );
      },
      { timeout: 60_000 },
    );
    return plan;
  }

  private async plan(ownerId: string, input: unknown) {
    let read: ReturnType<typeof readArchive>;
    try {
      read = readArchive(input);
    } catch (e) {
      if (e instanceof ArchiveError) throw new BadRequestException(e.message);
      throw e;
    }
    const { archive, unreadable } = read;

    // What is saved already: by id (a restore into the same account) and
    // by name with every number and email (a restore into a new one).
    const saved = await this.prisma.contact.findMany({
      where: { ownerId, deletedAt: null },
      select: {
        id: true,
        sortName: true,
        phoneNumbers: { select: { e164: true, digits: true } },
        emailAddresses: { select: { address: true } },
      },
    });
    const savedIds = new Set(saved.map((s) => s.id));
    const existing = new Map<string, Known[]>();
    for (const s of saved) {
      remember(existing, s.sortName, {
        id: s.id,
        phones: new Set(s.phoneNumbers.map(phoneKey)),
        emails: new Set(s.emailAddresses.map((e) => e.address)),
      });
    }

    const inFile = new Map<string, Known[]>();
    /** Backup contact id → the contact it is now (new or already saved). */
    const idOf = new Map<string, string>();
    const createdIds = new Set<string>();
    const created: NewContact[] = [];
    let alreadySaved = 0;
    let repeated = 0;
    for (const c of archive.contacts) {
      if (idOf.has(c.id)) {
        repeated++;
        continue;
      }
      if (savedIds.has(c.id)) {
        idOf.set(c.id, c.id);
        alreadySaved++;
        continue;
      }
      const sortName = sortKey(c.displayName);
      const phones = c.phones.map((p) => normalisePhone(p.raw));
      const known = {
        phones: new Set(phones.map(phoneKey)),
        emails: new Set(c.emails.map((e) => e.address)),
      };
      const same = match(existing, sortName, known);
      if (same) {
        idOf.set(c.id, same.id);
        alreadySaved++;
        continue;
      }
      const twin = match(inFile, sortName, known);
      if (twin) {
        idOf.set(c.id, twin.id);
        repeated++;
        continue;
      }
      const id = uuidv7();
      remember(inFile, sortName, { id, ...known });
      idOf.set(c.id, id);
      createdIds.add(id);
      created.push({ src: c, id, sortName, phones });
    }

    // Groups: matched by name; new ones respect the free plan's limit.
    const groups = await this.prisma.group.findMany({
      where: { ownerId },
      select: {
        id: true,
        nameKey: true,
        members: { select: { contactId: true } },
      },
    });
    const byKey = new Map(groups.map((g) => [g.nameKey, g]));
    const plus = await this.plans.isPlus(ownerId);
    let room = plus ? Infinity : Math.max(0, FREE_GROUPS - groups.length);
    type Planned = {
      id: string;
      name: string;
      kind: string;
      description: string | null;
      members: { contactId: string; role: string | null }[];
    };
    const newGroups: Planned[] = [];
    const groupUpdates: Planned[] = [];
    let overLimit = 0;
    const seenKeys = new Set<string>();
    for (const g of archive.groups) {
      const key = g.name.toLowerCase();
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      const have = byKey.get(key);
      const already = new Set(have?.members.map((m) => m.contactId) ?? []);
      const members: Planned['members'] = [];
      for (const m of g.members) {
        const id = idOf.get(m.contactId);
        if (!id || already.has(id)) continue;
        if (already.size + members.length >= MAX_MEMBERS) break;
        already.add(id);
        members.push({ contactId: id, role: m.role });
      }
      if (have) {
        if (members.length > 0) {
          groupUpdates.push({ ...g, id: have.id, members });
        }
      } else if (room > 0) {
        room--;
        newGroups.push({ ...g, id: uuidv7(), members });
      } else {
        overLimit++;
      }
    }

    // Follow-ups come back only with the contacts this restore creates, so
    // restoring twice never doubles them.
    const followUps = archive.followUps.filter((f) =>
      createdIds.has(idOf.get(f.contactId) ?? ''),
    );

    // Links between contacts that are (or will be) in this account, in the
    // order the database needs; ones already there are left alone.
    const existingLinks = await this.prisma.relationship.findMany({
      where: { ownerId },
      select: { fromId: true, toId: true, kind: true },
    });
    const have = new Set(
      existingLinks.map((l) => `${l.kind}:${l.fromId}:${l.toId}`),
    );
    const relationships: {
      fromId: string;
      toId: string;
      kind: string;
      label: string | null;
    }[] = [];
    for (const r of archive.relationships) {
      const a = idOf.get(r.fromId);
      const b = idOf.get(r.toId);
      if (!a || !b || a === b) continue;
      const o = ordered(r.kind, a, b);
      const key = `${r.kind}:${o.fromId}:${o.toId}`;
      if (have.has(key)) continue;
      have.add(key);
      relationships.push({ kind: r.kind, label: r.label, ...o });
    }

    const plan: RestorePlan = {
      contacts: {
        inBackup: archive.contacts.length,
        toAdd: created.length,
        alreadySaved,
        repeated,
      },
      groups: {
        inBackup: archive.groups.length,
        toAdd: newGroups.length,
        toUpdate: groupUpdates.length,
        overLimit,
      },
      memberships: [...newGroups, ...groupUpdates].reduce(
        (n, g) => n + g.members.length,
        0,
      ),
      followUps: followUps.length,
      relationships: relationships.length,
      unreadable,
    };
    return {
      plan,
      created,
      idOf,
      newGroups,
      groupUpdates,
      followUps,
      relationships,
    };
  }
}
