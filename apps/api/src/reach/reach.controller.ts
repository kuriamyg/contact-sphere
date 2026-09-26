import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { type AuthContext, CurrentAuth, Public } from '../auth/decorators';
import {
  CardDto,
  GroupSmsDto,
  PushDeviceDto,
  PushEndpointDto,
} from './reach.dto';
import {
  type CardView,
  type ReachStatus,
  ReachService,
  type SmsQuote,
} from './reach.service';

const Id = () => new ParseUUIDPipe();

/** Reach (Phase 11). Session required except the morning job. */
@Controller('reach')
export class ReachController {
  constructor(private readonly reach: ReachService) {}

  @Get('status')
  status(@CurrentAuth() a: AuthContext): Promise<ReachStatus> {
    return this.reach.status(a.userId);
  }

  @Post('push/devices')
  @HttpCode(HttpStatus.NO_CONTENT)
  addDevice(
    @CurrentAuth() a: AuthContext,
    @Body() dto: PushDeviceDto,
  ): Promise<void> {
    return this.reach.addDevice(a.userId, dto);
  }

  @Post('push/devices/remove')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDevice(
    @CurrentAuth() a: AuthContext,
    @Body() dto: PushEndpointDto,
  ): Promise<void> {
    return this.reach.removeDevice(a.userId, dto.endpoint);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('push/test')
  @HttpCode(HttpStatus.OK)
  test(@CurrentAuth() a: AuthContext): Promise<{ sent: number }> {
    return this.reach.testPush(a.userId);
  }

  /**
   * The morning reminder job. No session: the web server's scheduled route
   * calls it (it has checked its own cron secret); the BFF secret is still
   * required, like every route.
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('digest/run')
  @HttpCode(HttpStatus.OK)
  runDigest(): Promise<{ owners: number; sent: number }> {
    return this.reach.runDigest();
  }

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('groups/:id/sms/quote')
  @HttpCode(HttpStatus.OK)
  quote(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
    @Body() dto: GroupSmsDto,
  ): Promise<SmsQuote> {
    return this.reach.quote(a.userId, id, dto.message);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('groups/:id/sms')
  @HttpCode(HttpStatus.OK)
  send(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
    @Body() dto: GroupSmsDto,
  ): Promise<{ recipients: number; accepted: number }> {
    return this.reach.sendToGroup(a.userId, id, dto.message);
  }

  @Get('card')
  card(@CurrentAuth() a: AuthContext): Promise<CardView | null> {
    return this.reach.card(a.userId);
  }

  @Put('card')
  @HttpCode(HttpStatus.NO_CONTENT)
  setCard(@CurrentAuth() a: AuthContext, @Body() dto: CardDto): Promise<void> {
    return this.reach.setCard(a.userId, dto.contactId ?? null);
  }
}
