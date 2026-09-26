import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';

import { type AuthContext, CurrentAuth } from '../auth/decorators';
import { ContactedDto, FollowUpDto, KeepInTouchDto } from './remember.dto';
import {
  type ContactReminders,
  RememberService,
  type TodayView,
} from './remember.service';

const Id = () => new ParseUUIDPipe();

/** Keep-in-touch, follow-ups and Today (Phase 9). Owner-scoped. */
@Controller('remember')
export class RememberController {
  constructor(private readonly remember: RememberService) {}

  @Get('today')
  today(@CurrentAuth() a: AuthContext): Promise<TodayView> {
    return this.remember.today(a.userId);
  }

  @Get('contacts/:id')
  forContact(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
  ): Promise<ContactReminders> {
    return this.remember.forContact(a.userId, id);
  }

  @Put('contacts/:id/keep-in-touch')
  @HttpCode(HttpStatus.NO_CONTENT)
  keepInTouch(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
    @Body() dto: KeepInTouchDto,
  ): Promise<void> {
    return this.remember.setKeepInTouch(a.userId, id, dto.days ?? null);
  }

  @Post('contacts/:id/contacted')
  @HttpCode(HttpStatus.NO_CONTENT)
  contacted(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
    @Body() dto: ContactedDto,
  ): Promise<void> {
    return this.remember.contacted(a.userId, id, dto.at);
  }

  @Post('contacts/:id/follow-ups')
  addFollowUp(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
    @Body() dto: FollowUpDto,
  ): Promise<{ id: string }> {
    return this.remember.addFollowUp(a.userId, id, dto.dueOn, dto.note, dto.id);
  }

  @Post('follow-ups/:id/done')
  @HttpCode(HttpStatus.NO_CONTENT)
  done(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
  ): Promise<void> {
    return this.remember.done(a.userId, id);
  }

  @Delete('follow-ups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
  ): Promise<void> {
    return this.remember.remove(a.userId, id);
  }
}
