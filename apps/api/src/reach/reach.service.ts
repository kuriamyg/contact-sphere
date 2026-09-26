import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import type { Env } from '../config/env';
import { ENV } from '../config/env.provider';
import { PrismaService } from '../prisma/prisma.service';
import { nairobiToday } from '../remember/dates';
import { RememberService, type TodayView } from '../remember/remember.service';
import { PushService } from './push.service';
import { SMS_PROVIDER, type SmsProvider } from './sms-provider';
import { isKenyanMobile, MAX_SMS_PARTS, smsSize } from './sms-text';

/** A phone that fails this many sends in a row is dropped. */
const MAX_FAILURES = 5;
const MAX_DEVICES = 10;

export interface ReachStatus {
  push: { enabled: boolean; publicKey: string | null; devices: number };
  sms: {
    enabled: boolean;
    monthlyLimit: number;
    usedThisMonth: number;
    priceCents: number;
  };
}

export interface SmsQuote {
  recipients: number;
  /** Members with no Kenyan mobile number; they are not texted. */
  skipped: number;
  encoding: 'gsm' | 'unicode';
  length: number;
  parts: number;
  /** recipients × parts. */
  totalParts: number;
  costCents: number;
  remaining: number;
}

export interface CardView {
  contactId: string;
  displayName: string;
  givenName: string | null;
  familyName: string | null;
  organization: string | null;
  jobTitle: string | null;
  phones: { raw: string; e164: string | null; label: string | null }[];
  emails: { address: string; label: string | null }[];
}

/** The digest never names anyone: it shows on a locked screen. */
export function digestText(v: TodayView): string | null {
  const follow = v.followUps.filter((f) => f.daysAway <= 0).length;
  const birthdays = v.birthdays.filter((b) => b.daysAway === 0).length;
  const touch = v.keepInTouch.length;
  const parts = [
    follow && `${follow} follow-up${follow === 1 ? '' : 's'}`,
    birthdays && `${birthdays} birthday${birthdays === 1 ? '' : 's'}`,
    touch &&
      `${touch} ${touch === 1 ? 'person' : 'people'} to keep in touch with`,
  ].filter((p): p is string => !!p);
  if (parts.length === 0) return null;
  const list =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return `Today: ${list}.`;
}

const monthStart = (now: Date) => {
  // Calendar month in Nairobi (UTC+3, no daylight saving).
  const [y, m] = nairobiToday(now).split('-');
  return new Date(`${y}-${m}-01T00:00:00+03:00`);
};

/**
 * Reach (Phase 11): morning reminders on the phone, group texts through a
 * provider, and the owner's QR business card. Owner-scoped; audited by
 * counts only — never message text, names or numbers.
 */
@Injectable()
export class ReachService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly remember: RememberService,
    private readonly push: PushService,
    @Inject(ENV) private readonly env: Env,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider | null,
  ) {}

  async status(ownerId: string, now = new Date()): Promise<ReachStatus> {
    const [devices, used] = await Promise.all([
      this.prisma.pushSubscription.count({ where: { ownerId } }),
      this.usedThisMonth(ownerId, now),
    ]);
    return {
      push: {
        enabled: this.push.enabled,
        publicKey: this.push.publicKey,
        devices,
      },
      sms: {
        enabled: this.smsEnabled,
        monthlyLimit: this.env.sms?.monthlyLimit ?? 0,
        usedThisMonth: used,
        priceCents: this.env.sms?.priceCents ?? 0,
      },
    };
  }

  // ---- Web Push -----------------------------------------------------------

  async addDevice(
    ownerId: string,
    d: { endpoint: string; p256dh: string; auth: string },
  ): Promise<void> {
    if (!this.push.enabled) {
      throw new ForbiddenException('Reminders on the phone are not set up.');
    }
    const count = await this.prisma.pushSubscription.count({
      where: { ownerId, NOT: { endpoint: d.endpoint } },
    });
    if (count >= MAX_DEVICES) {
      throw new UnprocessableEntityException(
        `At most ${MAX_DEVICES} phones or browsers can get reminders.`,
      );
    }
    // An endpoint belongs to one browser; if it signs in as someone else,
    // the subscription moves with it.
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: d.endpoint },
      create: { ownerId, ...d },
      update: { ownerId, p256dh: d.p256dh, auth: d.auth, failures: 0 },
    });
  }

  async removeDevice(ownerId: string, endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({
      where: { ownerId, endpoint },
    });
  }

  /** Sends a test to every phone of this owner. */
  async testPush(ownerId: string): Promise<{ sent: number }> {
    if (!this.push.enabled) {
      throw new ForbiddenException('Reminders on the phone are not set up.');
    }
    const sent = await this.pushToOwner(ownerId, {
      title: 'Contact Sphere',
      body: 'Reminders are on. You will get one each morning when something is due.',
      url: '/today',
      tag: 'test',
    });
    return { sent };
  }

  /**
   * The morning job: each owner with a phone gets at most one reminder per
   * Nairobi day, and only when something is due. Safe to run twice.
   */
  async runDigest(now = new Date()): Promise<{ owners: number; sent: number }> {
    if (!this.push.enabled) return { owners: 0, sent: 0 };
    const today = nairobiToday(now);
    const todayDate = new Date(`${today}T00:00:00Z`);
    const owners = await this.prisma.user.findMany({
      where: {
        pushDevices: { some: {} },
        OR: [{ digestSentOn: null }, { digestSentOn: { lt: todayDate } }],
      },
      select: { id: true },
      take: 5000,
    });
    let sent = 0;
    let reached = 0;
    for (const { id } of owners) {
      // Claim the day first: a second, overlapping run skips this owner.
      const claimed = await this.prisma.user.updateMany({
        where: {
          id,
          OR: [{ digestSentOn: null }, { digestSentOn: { lt: todayDate } }],
        },
        data: { digestSentOn: todayDate },
      });
      if (claimed.count === 0) continue;
      const body = digestText(await this.remember.today(id, now));
      if (!body) continue;
      const n = await this.pushToOwner(id, {
        title: 'Contact Sphere',
        body,
        url: '/today',
        tag: 'today',
      });
      sent += n;
      if (n > 0) reached += 1;
    }
    return { owners: reached, sent };
  }

  private async pushToOwner(
    ownerId: string,
    msg: Parameters<PushService['deliver']>[1],
  ): Promise<number> {
    const devices = await this.prisma.pushSubscription.findMany({
      where: { ownerId },
    });
    let sent = 0;
    for (const d of devices) {
      const outcome = await this.push.deliver(d, msg);
      if (outcome === 'sent') {
        sent += 1;
        if (d.failures > 0) {
          await this.prisma.pushSubscription.update({
            where: { id: d.id },
            data: { failures: 0 },
          });
        }
      } else if (outcome === 'gone' || d.failures + 1 >= MAX_FAILURES) {
        await this.prisma.pushSubscription.deleteMany({ where: { id: d.id } });
      } else {
        await this.prisma.pushSubscription.update({
          where: { id: d.id },
          data: { failures: { increment: 1 } },
        });
      }
    }
    return sent;
  }

  // ---- Group texts through a provider --------------------------------------

  private get smsEnabled(): boolean {
    return !!this.sms && (this.env.sms?.monthlyLimit ?? 0) > 0;
  }

  private async usedThisMonth(ownerId: string, now: Date): Promise<number> {
    const rows = await this.prisma.smsSend.findMany({
      where: { ownerId, createdAt: { gte: monthStart(now) } },
      select: { accepted: true, segments: true },
    });
    return rows.reduce((n, r) => n + r.accepted * r.segments, 0);
  }

  private async recipients(ownerId: string, groupId: string) {
    const g = await this.prisma.group.findFirst({
      where: { id: groupId, ownerId },
      include: {
        members: {
          where: { contact: { deletedAt: null } },
          include: {
            contact: {
              include: { phoneNumbers: { orderBy: { position: 'asc' } } },
            },
          },
        },
      },
    });
    if (!g) throw new NotFoundException('Group not found.');
    const numbers = new Set<string>();
    let skipped = 0;
    for (const m of g.members) {
      const mobile = m.contact.phoneNumbers.find((p) => isKenyanMobile(p.e164));
      if (mobile?.e164) numbers.add(mobile.e164);
      else skipped += 1;
    }
    return { numbers: [...numbers], skipped };
  }

  async quote(
    ownerId: string,
    groupId: string,
    message: string,
    now = new Date(),
  ): Promise<SmsQuote> {
    const [{ numbers, skipped }, used] = await Promise.all([
      this.recipients(ownerId, groupId),
      this.usedThisMonth(ownerId, now),
    ]);
    const size = smsSize(message);
    const totalParts = numbers.length * size.parts;
    return {
      recipients: numbers.length,
      skipped,
      ...size,
      totalParts,
      costCents: totalParts * (this.env.sms?.priceCents ?? 0),
      remaining: Math.max(0, (this.env.sms?.monthlyLimit ?? 0) - used),
    };
  }

  async sendToGroup(
    ownerId: string,
    groupId: string,
    message: string,
    now = new Date(),
  ): Promise<{ recipients: number; accepted: number }> {
    if (!this.smsEnabled || !this.sms) {
      throw new ForbiddenException(
        'Sending through Contact Sphere is not available yet. Text from your phone instead.',
      );
    }
    const q = await this.quote(ownerId, groupId, message, now);
    if (q.recipients === 0) {
      throw new UnprocessableEntityException(
        'No one in this group has a Kenyan mobile number.',
      );
    }
    if (q.parts > MAX_SMS_PARTS) {
      throw new UnprocessableEntityException(
        `Keep it to ${MAX_SMS_PARTS} SMS or fewer.`,
      );
    }
    if (q.totalParts > q.remaining) {
      throw new UnprocessableEntityException(
        `This needs ${q.totalParts} SMS; ${q.remaining} left this month.`,
      );
    }
    const { numbers } = await this.recipients(ownerId, groupId);
    const { accepted } = await this.sms.send(numbers, message);
    await this.prisma.smsSend.create({
      data: {
        ownerId,
        recipients: numbers.length,
        segments: q.parts,
        accepted,
        provider: this.sms.name,
      },
    });
    await this.audit.record('group.texted', {
      actorUserId: ownerId,
      entityType: 'group',
      entityId: groupId,
      metadata: { recipients: numbers.length, accepted, parts: q.parts },
    });
    return { recipients: numbers.length, accepted };
  }

  // ---- QR business card ----------------------------------------------------

  async card(ownerId: string): Promise<CardView | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { cardContactId: true },
    });
    if (!user?.cardContactId) return null;
    const c = await this.prisma.contact.findFirst({
      where: { id: user.cardContactId, ownerId, deletedAt: null },
      include: {
        phoneNumbers: { orderBy: { position: 'asc' } },
        emailAddresses: { orderBy: { position: 'asc' } },
      },
    });
    if (!c) return null;
    return {
      contactId: c.id,
      displayName: c.displayName,
      givenName: c.givenName,
      familyName: c.familyName,
      organization: c.organization,
      jobTitle: c.jobTitle,
      phones: c.phoneNumbers.map((p) => ({
        raw: p.raw,
        e164: p.e164,
        label: p.label,
      })),
      emails: c.emailAddresses.map((e) => ({
        address: e.address,
        label: e.label,
      })),
    };
  }

  async setCard(ownerId: string, contactId: string | null): Promise<void> {
    if (contactId) {
      const c = await this.prisma.contact.findFirst({
        where: { id: contactId, ownerId, deletedAt: null },
        select: { id: true },
      });
      if (!c) throw new NotFoundException('Contact not found.');
    }
    await this.prisma.user.update({
      where: { id: ownerId },
      data: { cardContactId: contactId },
    });
  }
}
