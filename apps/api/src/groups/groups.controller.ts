import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';

import { type AuthContext, CurrentAuth } from '../auth/decorators';
import { AddMembersDto, GroupInputDto, RoleDto } from './groups.dto';
import {
  type GroupDetail,
  type GroupSummary,
  GroupsService,
} from './groups.service';

const Id = () => new ParseUUIDPipe();

/** The owner's groups (Phase 8). Session required; owner-scoped. */
@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  list(@CurrentAuth() a: AuthContext): Promise<GroupSummary[]> {
    return this.groups.list(a.userId);
  }

  @Post()
  create(
    @CurrentAuth() a: AuthContext,
    @Body() dto: GroupInputDto,
  ): Promise<GroupSummary> {
    return this.groups.create(a.userId, dto);
  }

  /** The groups a contact is in. */
  @Get('for-contact/:contactId')
  forContact(
    @CurrentAuth() a: AuthContext,
    @Param('contactId', Id()) contactId: string,
  ) {
    return this.groups.forContact(a.userId, contactId);
  }

  @Get(':id')
  get(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
  ): Promise<GroupDetail> {
    return this.groups.get(a.userId, id);
  }

  @Put(':id')
  update(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
    @Body() dto: GroupInputDto,
  ): Promise<GroupSummary> {
    return this.groups.update(a.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
  ): Promise<void> {
    return this.groups.remove(a.userId, id);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.OK)
  addMembers(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
    @Body() dto: AddMembersDto,
  ): Promise<{ added: number }> {
    return this.groups.addMembers(a.userId, id, dto);
  }

  @Put(':id/members/:contactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  setRole(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
    @Param('contactId', Id()) contactId: string,
    @Body() dto: RoleDto,
  ): Promise<void> {
    return this.groups.setRole(a.userId, id, contactId, dto.role);
  }

  @Delete(':id/members/:contactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
    @Param('contactId', Id()) contactId: string,
  ): Promise<void> {
    return this.groups.removeMember(a.userId, id, contactId);
  }

  /** The members as a .vcf download. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Get(':id/export')
  @Header('Content-Type', 'text/vcard; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async export(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const { name, vcf } = await this.groups.exportVcf(a.userId, id);
    const file = name.replace(/[^\w -]/g, '').trim() || 'group';
    res.setHeader('content-disposition', `attachment; filename="${file}.vcf"`);
    return vcf;
  }
}
