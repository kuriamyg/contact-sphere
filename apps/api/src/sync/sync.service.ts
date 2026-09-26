import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { nairobiToday } from '../remember/dates';

/**
 * The offline copy (Phase 10b): everything the phone needs to browse,
 * search and call with no data — contacts not archived or trashed, their
 * groups and open follow-ups. One compact document, fetched by the owner's
 * own signed-in app and kept only on that device.
 */
export interface Snapshot {
  version: 1;
  ownerId: string;
  generatedAt: string;
  /** Nairobi day on the server when made. */
  today: string;
  contacts: {
    id: string;
    name: string;
    organization: string | null;
    jobTitle: string | null;
    nickname: string | null;
    area: string | null;
    metThrough: string | null;
    tags: string[];
    birthday: string | null;
    notes: string | null;
    createdOn: string;
    keepInTouchDays: number | null;
    lastContactedOn: string | null;
    /** [raw, e164 or null, label or null] */
    phones: [string, string | null, string | null][];
    /** [address, label or null] */
    emails: [string, string | null][];
  }[];
  groups: {
    id: string;
    name: string;
    kind: string;
    /** [contactId, role or null] */
    members: [string, string | null][];
  }[];
  followUps: { id: string; contactId: string; dueOn: string; note: string }[];
}

const day = (d: Date) => d.toISOString().slice(0, 10);

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  async snapshot(ownerId: string, now = new Date()): Promise<Snapshot> {
    const live = { ownerId, deletedAt: null, archivedAt: null } as const;
    const [contacts, groups, followUps] = await Promise.all([
      this.prisma.contact.findMany({
        where: live,
        orderBy: { sortName: 'asc' },
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
            where: { contact: { deletedAt: null, archivedAt: null } },
            select: { contactId: true, role: true },
          },
        },
      }),
      this.prisma.followUp.findMany({
        where: { ownerId, doneAt: null, contact: live },
        orderBy: { dueOn: 'asc' },
        select: { id: true, contactId: true, dueOn: true, note: true },
      }),
    ]);
    return {
      version: 1,
      ownerId,
      generatedAt: now.toISOString(),
      today: nairobiToday(now),
      contacts: contacts.map((c) => ({
        id: c.id,
        name: c.displayName,
        organization: c.organization,
        jobTitle: c.jobTitle,
        nickname: c.nickname,
        area: c.area,
        metThrough: c.metThrough,
        tags: c.tags,
        birthday: c.birthday ? day(c.birthday) : null,
        notes: c.notes,
        createdOn: nairobiToday(c.createdAt),
        keepInTouchDays: c.keepInTouchDays,
        lastContactedOn: c.lastContactedAt
          ? nairobiToday(c.lastContactedAt)
          : null,
        phones: c.phoneNumbers.map((p) => [p.raw, p.e164, p.label]),
        emails: c.emailAddresses.map((e) => [e.address, e.label]),
      })),
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        kind: g.kind,
        members: g.members.map((m) => [m.contactId, m.role]),
      })),
      followUps: followUps.map((f) => ({
        id: f.id,
        contactId: f.contactId,
        dueOn: day(f.dueOn),
        note: f.note,
      })),
    };
  }
}
