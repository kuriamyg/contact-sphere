import { ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

/** Plus prices (B9, ADR 0019): KES 99 a month, KES 990 a year. */
export const PRICES = [
  { months: 1, amountKes: 99 },
  { months: 12, amountKes: 990 },
] as const;
export const TRIAL_DAYS = 30;
/** Groups the free plan keeps; Plus has no limit. */
export const FREE_GROUPS = 3;

export const PLUS_REMINDERS = 'Morning reminders are part of Plus.';
export const GROUP_LIMIT = 'The free plan holds 3 groups. Plus has no limit.';

/** The same moment `months` calendar months later. */
export function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/** Who has Plus. The operator always does. */
@Injectable()
export class Plans {
  constructor(private readonly prisma: PrismaService) {}

  async isPlus(ownerId: string, now = new Date()): Promise<boolean> {
    const u = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { role: true, plusUntil: true },
    });
    return (
      !!u && (u.role === 'operator' || (!!u.plusUntil && u.plusUntil > now))
    );
  }

  async requirePlus(ownerId: string, message: string): Promise<void> {
    if (!(await this.isPlus(ownerId))) throw new ForbiddenException(message);
  }

  /** A Prisma filter for accounts with Plus at `now`. */
  static plusWhere(now: Date) {
    return {
      OR: [{ role: 'operator' }, { plusUntil: { gt: now } }],
    };
  }
}
