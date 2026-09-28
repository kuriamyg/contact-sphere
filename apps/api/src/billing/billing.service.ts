import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { kenyanMobile } from '../auth/mobile';
import { secretsEqual } from '../auth/tokens';
import type { Env } from '../config/env';
import { ENV } from '../config/env.provider';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MPESA, type MpesaClient, parseStkCallback } from './mpesa';
import { addMonths, PRICES } from './plans.service';

type Tx = Prisma.TransactionClient;

/** A prompt nobody answers is given up after this long. */
const PROMPT_EXPIRES_MS = 3 * 60_000;
/** Ask Safaricom about a pending prompt at most this often. */
const QUERY_EVERY_MS = 10_000;
const PROMPTS_PER_DAY = 5;

export interface PaymentView {
  id: string;
  method: string;
  months: number;
  amountKes: number;
  status: string;
  receipt: string | null;
  resultDesc: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface BillingStatus {
  plan: 'plus' | 'free';
  plusUntil: string | null;
  operator: boolean;
  prices: readonly { months: number; amountKes: number }[];
  mpesa: boolean;
  payTo: string | null;
  payments: PaymentView[];
}

const view = (p: {
  id: string;
  method: string;
  months: number;
  amountKes: number;
  status: string;
  receipt: string | null;
  resultDesc: string | null;
  createdAt: Date;
  paidAt: Date | null;
}): PaymentView => ({
  ...p,
  createdAt: p.createdAt.toISOString(),
  paidAt: p.paidAt?.toISOString() ?? null,
});

/**
 * Plans and payments (B9, ADR 0019): the M-Pesa prompt, its callback and
 * status checks, and the operator's grants and hand-recorded payments.
 * Every path that credits Plus goes through `credit`, once per payment.
 */
@Injectable()
export class BillingService {
  private readonly lastQuery = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
    @Inject(MPESA) private readonly mpesa: MpesaClient | null,
  ) {}

  async status(ownerId: string, now = new Date()): Promise<BillingStatus> {
    const [user, payments] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: ownerId },
        select: { role: true, plusUntil: true },
      }),
      this.prisma.payment.findMany({
        where: { ownerId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);
    const operator = user.role === 'operator';
    const plus = operator || (!!user.plusUntil && user.plusUntil > now);
    return {
      plan: plus ? 'plus' : 'free',
      plusUntil: user.plusUntil?.toISOString() ?? null,
      operator,
      prices: PRICES,
      mpesa: this.mpesa !== null,
      payTo: this.env.billing.payTo ?? null,
      payments: payments.map(view),
    };
  }

  // ---- The M-Pesa prompt ------------------------------------------------

  async startMpesa(
    ownerId: string,
    months: number,
    phoneInput: string,
    now = new Date(),
  ): Promise<{ paymentId: string }> {
    if (!this.mpesa) throw new NotFoundException();
    const price = PRICES.find((p) => p.months === months);
    if (!price) throw new NotFoundException();
    const phone = kenyanMobile(phoneInput);
    if (!phone) {
      throw new HttpException(
        'Enter the M-Pesa number, like 0712 345 678.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const recent = await this.prisma.payment.findMany({
      where: {
        ownerId,
        method: 'mpesa_stk',
        createdAt: { gt: new Date(now.getTime() - 24 * 3600_000) },
      },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: 'desc' },
    });
    if (
      recent.length >= PROMPTS_PER_DAY ||
      (recent[0]?.status === 'pending' &&
        now.getTime() - recent[0].createdAt.getTime() < 60_000)
    ) {
      throw new HttpException(
        'Wait a minute before asking for another M-Pesa prompt.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const started = await this.mpesa.stkPush({
      phone: phone.slice(1),
      amountKes: price.amountKes,
      reference: 'ContactSphere',
      callbackUrl: this.callbackUrl(),
    });
    if (!started.ok) {
      throw new ServiceUnavailableException(
        'M-Pesa did not accept the request just now. Try again in a minute.',
      );
    }
    const payment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          ownerId,
          method: 'mpesa_stk',
          months,
          amountKes: price.amountKes,
          status: 'pending',
          checkoutId: started.checkoutId,
        },
        select: { id: true },
      });
      await this.audit.record(
        'billing.mpesa_started',
        {
          actorUserId: ownerId,
          entityType: 'payment',
          entityId: p.id,
          metadata: { months, amountKes: price.amountKes },
        },
        tx,
      );
      return p;
    });
    return { paymentId: payment.id };
  }

  /** The Plan page polls this while the customer enters their PIN. */
  async payment(
    ownerId: string,
    id: string,
    now = new Date(),
  ): Promise<PaymentView> {
    let p = await this.prisma.payment.findFirst({ where: { id, ownerId } });
    if (!p) throw new NotFoundException();
    if (p.status === 'pending' && p.checkoutId && this.mpesa) {
      const age = now.getTime() - p.createdAt.getTime();
      const last = this.lastQuery.get(p.id) ?? 0;
      if (age > QUERY_EVERY_MS && now.getTime() - last > QUERY_EVERY_MS) {
        this.lastQuery.set(p.id, now.getTime());
        const q = await this.mpesa.query(p.checkoutId);
        if (q.state === 'paid') await this.credit(p.id, null, now);
        else if (q.state === 'failed') await this.fail(p.id, q.resultDesc);
        else if (age > PROMPT_EXPIRES_MS) {
          await this.fail(p.id, 'No answer from M-Pesa.');
        }
        p = await this.prisma.payment.findFirstOrThrow({ where: { id } });
      }
    }
    return view(p);
  }

  /**
   * Safaricom's callback, forwarded by the web server. Unsigned, so it is
   * trusted only when the secret token matches, the checkout id is one of
   * ours and still pending, and the amount is exactly what we asked for.
   */
  async callback(token: string, body: unknown, now = new Date()) {
    const cfg = this.env.billing.mpesa;
    if (!cfg || !secretsEqual(token, cfg.callbackToken)) {
      throw new NotFoundException();
    }
    const cb = parseStkCallback(body);
    if (!cb) return;
    const p = await this.prisma.payment.findUnique({
      where: { checkoutId: cb.checkoutId },
    });
    if (!p || p.status !== 'pending') return;
    if (cb.resultCode !== 0) {
      await this.fail(p.id, cb.resultDesc);
      return;
    }
    if (cb.amount !== p.amountKes) {
      await this.fail(p.id, 'Amount did not match.');
      return;
    }
    const receipt =
      cb.receipt && /^[A-Z0-9]{10}$/.test(cb.receipt) ? cb.receipt : null;
    await this.credit(p.id, receipt, now);
  }

  private callbackUrl(): string {
    const origin = this.env.webOrigins[0] ?? '';
    return `${origin}/api/mpesa/callback/${this.env.billing.mpesa?.callbackToken ?? ''}`;
  }

  // ---- Crediting ----------------------------------------------------------

  /** Marks a pending payment paid and extends Plus, exactly once. */
  private async credit(id: string, receipt: string | null, now: Date) {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.payment.updateMany({
        where: { id, status: 'pending' },
        data: { status: 'paid', paidAt: now, receipt },
      });
      if (count === 0) return;
      const p = await tx.payment.findUniqueOrThrow({ where: { id } });
      if (p.ownerId) await this.extend(tx, p.ownerId, p.months, now);
      await this.audit.record(
        'billing.paid',
        {
          actorUserId: p.ownerId,
          entityType: 'payment',
          entityId: id,
          metadata: { months: p.months, amountKes: p.amountKes },
        },
        tx,
      );
    });
  }

  private async fail(id: string, resultDesc: string) {
    const { count } = await this.prisma.payment.updateMany({
      where: { id, status: 'pending' },
      data: { status: 'failed', resultDesc },
    });
    if (count > 0) {
      await this.audit.record('billing.failed', {
        entityType: 'payment',
        entityId: id,
      });
    }
  }

  /** Plus runs from now, or from its current end if later. */
  private async extend(tx: Tx, ownerId: string, months: number, now: Date) {
    const u = await tx.user.findUniqueOrThrow({
      where: { id: ownerId },
      select: { plusUntil: true },
    });
    const from = u.plusUntil && u.plusUntil > now ? u.plusUntil : now;
    await tx.user.update({
      where: { id: ownerId },
      data: { plusUntil: addMonths(from, months) },
    });
  }

  // ---- Operator -----------------------------------------------------------

  private async requireOperator(userId: string): Promise<void> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (u?.role !== 'operator') throw new ForbiddenException();
  }

  /**
   * Everyone with an account: who they are, their plan and how much they
   * use it (counts only — never their contacts' details).
   */
  async accounts(operatorId: string) {
    await this.requireOperator(operatorId);
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        displayName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        plusUntil: true,
        _count: { select: { contacts: true, groups: true } },
      },
    });
    const ids = users.map((u) => u.id);
    const [seen, paid] = await Promise.all([
      this.prisma.session.groupBy({
        by: ['userId'],
        where: { userId: { in: ids } },
        _max: { lastSeenAt: true },
      }),
      this.prisma.payment.groupBy({
        by: ['ownerId'],
        where: { ownerId: { in: ids }, status: 'paid' },
        _sum: { amountKes: true },
      }),
    ]);
    const seenBy = new Map(seen.map((s) => [s.userId, s._max.lastSeenAt]));
    const paidBy = new Map(paid.map((p) => [p.ownerId, p._sum.amountKes]));
    const now = new Date();
    return users.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      email: u.email,
      phone: u.phone,
      operator: u.role === 'operator',
      createdAt: u.createdAt.toISOString(),
      plan:
        u.role === 'operator' || (u.plusUntil && u.plusUntil > now)
          ? 'plus'
          : 'free',
      plusUntil: u.plusUntil?.toISOString() ?? null,
      contacts: u._count.contacts,
      groups: u._count.groups,
      lastSeenAt: seenBy.get(u.id)?.toISOString() ?? null,
      paidKes: paidBy.get(u.id) ?? 0,
    }));
  }

  async grant(
    operatorId: string,
    userId: string,
    months: number,
    now = new Date(),
  ): Promise<void> {
    await this.requireOperator(operatorId);
    await this.addPaid(operatorId, userId, now, {
      method: 'grant',
      months,
      amountKes: 0,
      receipt: null,
    });
  }

  async record(
    operatorId: string,
    userId: string,
    dto: { receipt: string; amountKes: number; months: number },
    now = new Date(),
  ): Promise<void> {
    await this.requireOperator(operatorId);
    try {
      await this.addPaid(operatorId, userId, now, {
        method: 'manual',
        ...dto,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('That M-Pesa code is already recorded.');
      }
      throw err;
    }
  }

  private async addPaid(
    operatorId: string,
    userId: string,
    now: Date,
    p: {
      method: 'grant' | 'manual';
      months: number;
      amountKes: number;
      receipt: string | null;
    },
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const exists = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException();
      const created = await tx.payment.create({
        data: {
          ownerId: userId,
          method: p.method,
          months: p.months,
          amountKes: p.amountKes,
          receipt: p.receipt,
          status: 'paid',
          paidAt: now,
          recordedById: operatorId,
        },
        select: { id: true },
      });
      await this.extend(tx, userId, p.months, now);
      await this.audit.record(
        p.method === 'grant' ? 'billing.granted' : 'billing.recorded',
        {
          actorUserId: operatorId,
          entityType: 'payment',
          entityId: created.id,
          metadata: { months: p.months, amountKes: p.amountKes },
        },
        tx,
      );
    });
  }
}
