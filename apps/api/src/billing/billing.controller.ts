import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { type AuthContext, CurrentAuth, Public } from '../auth/decorators';
import { GrantDto, MpesaPayDto, RecordPaymentDto } from './billing.dto';
import {
  type BillingStatus,
  BillingService,
  type PaymentView,
} from './billing.service';

const Id = () => new ParseUUIDPipe();

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  status(@CurrentAuth() auth: AuthContext): Promise<BillingStatus> {
    return this.billing.status(auth.userId);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('mpesa')
  @HttpCode(HttpStatus.CREATED)
  pay(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: MpesaPayDto,
  ): Promise<{ paymentId: string }> {
    return this.billing.startMpesa(auth.userId, dto.months, dto.phone);
  }

  @Get('payments/:id')
  payment(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id()) id: string,
  ): Promise<PaymentView> {
    return this.billing.payment(auth.userId, id);
  }

  /**
   * Safaricom's result for a prompt. Safaricom calls the web server
   * (/api/mpesa/callback/<token>), which forwards it here with the
   * web-server secret like any other call (ADR 0006); the token is checked
   * in the service.
   */
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('mpesa/callback/:token')
  @HttpCode(HttpStatus.OK)
  async callback(
    @Param('token') token: string,
    @Body() body: unknown,
  ): Promise<{ ResultCode: number; ResultDesc: string }> {
    await this.billing.callback(token, body);
    return { ResultCode: 0, ResultDesc: 'Accepted' };
  }
}

/** The operator's view of accounts and payments (B9, ADR 0019). */
@Controller('operator')
export class OperatorController {
  constructor(private readonly billing: BillingService) {}

  @Get('accounts')
  accounts(@CurrentAuth() auth: AuthContext) {
    return this.billing.accounts(auth.userId);
  }

  @Post('accounts/:id/grant')
  @HttpCode(HttpStatus.NO_CONTENT)
  grant(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id()) id: string,
    @Body() dto: GrantDto,
  ): Promise<void> {
    return this.billing.grant(auth.userId, id, dto.months);
  }

  @Post('accounts/:id/payments')
  @HttpCode(HttpStatus.NO_CONTENT)
  record(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id()) id: string,
    @Body() dto: RecordPaymentDto,
  ): Promise<void> {
    return this.billing.record(auth.userId, id, dto);
  }
}
