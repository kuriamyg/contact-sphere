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
  Query,
} from '@nestjs/common';

import { type AuthContext, CurrentAuth } from '../auth/decorators';
import {
  type ContactDetail,
  type ContactPage,
  ContactsService,
} from './contacts.service';
import { ContactInputDto, ListContactsQueryDto } from './dto/contact.dto';

const Id = () => new ParseUUIDPipe({ version: '7' });

/**
 * The owner's contacts. Every route needs a session (global SessionGuard)
 * and acts only on the session owner's rows.
 */
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  list(
    @CurrentAuth() a: AuthContext,
    @Query() q: ListContactsQueryDto,
  ): Promise<ContactPage> {
    return this.contacts.list(a.userId, q);
  }

  @Post()
  create(
    @CurrentAuth() a: AuthContext,
    @Body() dto: ContactInputDto,
  ): Promise<ContactDetail> {
    return this.contacts.create(a.userId, dto);
  }

  /** Deletes every contact in the trash, for good. */
  @Delete('trash')
  emptyTrash(@CurrentAuth() a: AuthContext): Promise<{ deleted: number }> {
    return this.contacts.emptyTrash(a.userId);
  }

  @Get(':id')
  get(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
  ): Promise<ContactDetail> {
    return this.contacts.get(a.userId, id);
  }

  @Put(':id')
  update(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
    @Body() dto: ContactInputDto,
  ): Promise<ContactDetail> {
    return this.contacts.update(a.userId, id, dto);
  }

  /** Moves the contact to the trash. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  trash(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
  ): Promise<void> {
    return this.contacts.trash(a.userId, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.NO_CONTENT)
  restore(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
  ): Promise<void> {
    return this.contacts.restore(a.userId, id);
  }

  @Delete(':id/permanent')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePermanently(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
  ): Promise<void> {
    return this.contacts.deletePermanently(a.userId, id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  archive(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
  ): Promise<void> {
    return this.contacts.archive(a.userId, id);
  }

  @Post(':id/unarchive')
  @HttpCode(HttpStatus.NO_CONTENT)
  unarchive(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
  ): Promise<void> {
    return this.contacts.unarchive(a.userId, id);
  }

  /** The owner opened the contact (ADR 0007). */
  @Post(':id/used')
  @HttpCode(HttpStatus.NO_CONTENT)
  markUsed(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
  ): Promise<void> {
    return this.contacts.markUsed(a.userId, id);
  }
}
