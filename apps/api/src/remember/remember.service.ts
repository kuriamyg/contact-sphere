import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  addDays,
  daysBetween,
  keepInTouchDue,
  nairobiToday,
  nextBirthday,
} from './dates';

/** Look this far ahead for birthdays and follow-ups on the Today screen. */
export const BIRTHDAY_DAYS = 14;
export const FOLLOW_UP_DAYS = 7;
const MAX_OPEN_FOLLOW_UPS = 50;

type Phone = { raw: string; e164: string | null } | null;

export interface TodayView {
  today: string;
  followUps: {
    id: string;
    contactId: string;
    displayName: string;
    note: string;
    dueOn: string;
    /** Negative = overdue by that many days. */
    daysAway: number;
    phone: Phone;
  }[];
  keepInTouch: {
    contactId: string;
    displayName: string;
    everyDays: number;
    lastContactedAt: string | null;
    dueOn: string;
    overdueDays: number;
    phone: Phone;
  }[];
  birthdays: {
    contactId: string;
    displayName: string;
    on: string;
    daysAway: number;
    turning: number;
    phone: Phone;
  }[];
}

export interface ContactReminders {
  keepInTouchDays: number | null;
  lastContactedAt: string | null;
  due: { dueOn: string; overdueDays: number } | null;
  followUps: {
    id: string;
    dueOn: string;
    note: string;
    doneAt: string | null;
  }[];
}

const day = (d: Date) => d.toISOString().slice(0, 10);
const nairobiDay = (d: Date) => nairobiToday(d);
const primaryPhone = { phoneNumbers: { where: { position: 0 } } } as const;
const phoneOf = (c: {
  phoneNumbers: { raw: string; e164: string | null }[];
}): Phone =>
  c.phoneNumbers[0]
    ? { raw: c.phoneNumbers[0].raw, e164: c.phoneNumbers[0].e164 }
    : null;
/** Reminders are about the people in your list: not archived, not trashed. */
const active = { deletedAt: null, archivedAt: null } as const;

/**
 * Remember (Phase 9): keep-in-touch cadences, dated follow-ups and the
 * Today screen. Owner-scoped. Notes are the owner's data and are never
 * written to the audit log; "contacted" is not an edit.
 */
@Injectable()
export class RememberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async today(ownerId: string, now = new Date()): Promise<TodayView> {
    const today = nairobiToday(now);
    const [followUps, cadenced, birthdays] = await Promise.all([
      this.prisma.followUp.findMany({
        where: {
          ownerId,
          doneAt: null,
          dueOn: {
            lte: new Date(`${addDays(today, FOLLOW_UP_DAYS)}T00:00:00Z`),
          },
          contact: active,
        },
        orderBy: [{ dueOn: 'asc' }, { createdAt: 'asc' }],
        take: 100,
        include: { contact: { include: primaryPhone } },
      }),
      this.prisma.contact.findMany({
        where: { ownerId, ...active, keepInTouchDays: { not: null } },
        include: primaryPhone,
      }),
      this.prisma.contact.findMany({
        where: { ownerId, ...active, birthday: { not: null } },
        include: primaryPhone,
      }),
    ]);
    return {
      today,
      followUps: followUps.map((f) => ({
        id: f.id,
        contactId: f.contactId,
        displayName: f.contact.displayName,
        note: f.note,
        dueOn: day(f.dueOn),
        daysAway: daysBetween(today, day(f.dueOn)),
        phone: phoneOf(f.contact),
      })),
      keepInTouch: cadenced
        .map((c) => {
          const due = keepInTouchDue(
            c.keepInTouchDays!,
            c.lastContactedAt ? nairobiDay(c.lastContactedAt) : null,
            nairobiDay(c.createdAt),
            today,
          );
          return {
            contactId: c.id,
            displayName: c.displayName,
            everyDays: c.keepInTouchDays!,
            lastContactedAt: c.lastContactedAt?.toISOString() ?? null,
            ...due,
            phone: phoneOf(c),
          };
        })
        .filter((k) => k.overdueDays >= 0)
        .sort(
          (a, b) =>
            b.overdueDays - a.overdueDays ||
            a.displayName.localeCompare(b.displayName),
        )
        .slice(0, 100),
      birthdays: birthdays
        .map((c) => ({
          contactId: c.id,
          displayName: c.displayName,
          ...nextBirthday(day(c.birthday!), today),
          phone: phoneOf(c),
        }))
        .filter((b) => b.daysAway <= BIRTHDAY_DAYS)
        .sort(
          (a, b) =>
            a.daysAway - b.daysAway ||
            a.displayName.localeCompare(b.displayName),
        ),
    };
  }

  async forContact(
    ownerId: string,
    contactId: string,
    now = new Date(),
  ): Promise<ContactReminders> {
    const c = await this.prisma.contact.findFirst({
      where: { id: contactId, ownerId },
      include: {
        followUps: {
          orderBy: [
            { doneAt: { sort: 'desc', nulls: 'first' } },
            { dueOn: 'asc' },
          ],
          take: 60,
        },
      },
    });
    if (!c) throw new NotFoundException('Contact not found.');
    const open = c.followUps.filter((f) => !f.doneAt);
    const done = c.followUps.filter((f) => f.doneAt).slice(0, 5);
    return {
      keepInTouchDays: c.keepInTouchDays,
      lastContactedAt: c.lastContactedAt?.toISOString() ?? null,
      due: c.keepInTouchDays
        ? keepInTouchDue(
            c.keepInTouchDays,
            c.lastContactedAt ? nairobiDay(c.lastContactedAt) : null,
            nairobiDay(c.createdAt),
            nairobiToday(now),
          )
        : null,
      followUps: [...open, ...done].map((f) => ({
        id: f.id,
        dueOn: day(f.dueOn),
        note: f.note,
        doneAt: f.doneAt?.toISOString() ?? null,
      })),
    };
  }

  /** Not an edit of the person: raw SQL leaves `updated_at` alone. */
  async setKeepInTouch(
    ownerId: string,
    contactId: string,
    days: number | null,
  ): Promise<void> {
    await this.requireLive(ownerId, contactId);
    await this.prisma.$executeRaw`
      UPDATE contacts SET keep_in_touch_days = ${days}::smallint
      WHERE id = ${contactId}::uuid AND owner_id = ${ownerId}::uuid`;
    await this.audit.record('contact.keep_in_touch_set', {
      actorUserId: ownerId,
      entityType: 'contact',
      entityId: contactId,
      metadata: { days: days ?? 0 },
    });
  }

  /**
   * "I was in touch." Not an edit; not audited (like last used). `at` is
   * when it happened, for ones recorded offline (up to 30 days back); the
   * latest time wins, and never earlier than the contact was saved.
   */
  async contacted(
    ownerId: string,
    contactId: string,
    at?: string,
    now = new Date(),
  ): Promise<void> {
    const when = at ? new Date(at) : now;
    if (
      when.getTime() > now.getTime() + 5 * 60_000 ||
      when.getTime() < now.getTime() - 30 * 86_400_000
    ) {
      throw new BadRequestException('at must be within the last 30 days');
    }
    await this.requireLive(ownerId, contactId);
    await this.prisma.$executeRaw`
      UPDATE contacts
      SET last_contacted_at = GREATEST(last_contacted_at, ${when}::timestamptz, created_at)
      WHERE id = ${contactId}::uuid AND owner_id = ${ownerId}::uuid`;
  }

  async addFollowUp(
    ownerId: string,
    contactId: string,
    dueOn: string,
    note: string,
    id?: string,
  ): Promise<{ id: string }> {
    if (id) {
      const existing = await this.prisma.followUp.findFirst({
        where: { id },
        select: { ownerId: true },
      });
      if (existing) {
        if (existing.ownerId !== ownerId) {
          throw new ConflictException('That id is taken.');
        }
        return { id };
      }
    }
    const d = new Date(`${dueOn}T00:00:00Z`);
    if (Number.isNaN(d.getTime()) || day(d) !== dueOn) {
      throw new BadRequestException('dueOn must be a real date');
    }
    if (dueOn < '2000-01-01' || dueOn > '2100-12-31') {
      throw new BadRequestException('dueOn is out of range');
    }
    return this.prisma.$transaction(async (tx) => {
      const c = await tx.contact.findFirst({
        where: { id: contactId, ownerId },
        select: { deletedAt: true },
      });
      if (!c) throw new NotFoundException('Contact not found.');
      if (c.deletedAt) {
        throw new ConflictException(
          'Restore the contact from the trash first.',
        );
      }
      const open = await tx.followUp.count({
        where: { ownerId, contactId, doneAt: null },
      });
      if (open >= MAX_OPEN_FOLLOW_UPS) {
        throw new ConflictException(
          `A contact can have up to ${MAX_OPEN_FOLLOW_UPS} open follow-ups.`,
        );
      }
      const f = await tx.followUp.create({
        data: { ...(id ? { id } : {}), ownerId, contactId, dueOn: d, note },
        select: { id: true },
      });
      await this.audit.record(
        'follow_up.created',
        { actorUserId: ownerId, entityType: 'follow_up', entityId: f.id },
        tx,
      );
      return f;
    });
  }

  async done(ownerId: string, id: string): Promise<void> {
    const { count } = await this.prisma.followUp.updateMany({
      where: { id, ownerId, doneAt: null },
      data: { doneAt: new Date() },
    });
    if (count === 0) {
      const exists = await this.prisma.followUp.count({
        where: { id, ownerId },
      });
      if (!exists) throw new NotFoundException('Follow-up not found.');
    }
  }

  async remove(ownerId: string, id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.followUp.deleteMany({
        where: { id, ownerId },
      });
      if (count === 0) throw new NotFoundException('Follow-up not found.');
      await this.audit.record(
        'follow_up.deleted',
        { actorUserId: ownerId, entityType: 'follow_up', entityId: id },
        tx,
      );
    });
  }

  private async requireLive(ownerId: string, contactId: string) {
    const c = await this.prisma.contact.findFirst({
      where: { id: contactId, ownerId },
      select: { deletedAt: true },
    });
    if (!c) throw new NotFoundException('Contact not found.');
    if (c.deletedAt) {
      throw new ConflictException('Restore the contact from the trash first.');
    }
  }
}
