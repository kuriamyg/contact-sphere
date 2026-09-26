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
  Query,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';

import { type AuthContext, CurrentAuth } from '../auth/decorators';
import {
  ContactsImportService,
  type ImportPlan,
} from './contacts-import.service';
import {
  type ContactDetail,
  type ContactPage,
  ContactsService,
} from './contacts.service';
import {
  ContactInputDto,
  ImportVcfDto,
  ListContactsQueryDto,
} from './dto/contact.dto';

/** Imports parse up to megabytes of text: a few a minute is plenty. */
const IMPORT_LIMIT = { default: { limit: 10, ttl: 60_000 } };

/**
 * Any well-formed UUID: ours are v7, but an id from anywhere else should get
 * a plain 404 rather than a validation error.
 */
const Id = () => new ParseUUIDPipe();

/**
 * The owner's contacts. Every route needs a session (global SessionGuard)
 * and acts only on the session owner's rows.
 */
@Controller('contacts')
export class ContactsController {
  constructor(
    private readonly contacts: ContactsService,
    private readonly vcf: ContactsImportService,
  ) {}

  /** What importing this .vcf would do. Changes nothing. */
  @Throttle(IMPORT_LIMIT)
  @Post('import/preview')
  @HttpCode(HttpStatus.OK)
  previewImport(
    @CurrentAuth() a: AuthContext,
    @Body() dto: ImportVcfDto,
  ): Promise<ImportPlan> {
    return this.vcf.preview(a.userId, dto.vcf);
  }

  /** Adds the file's new contacts; exact repeats are skipped. */
  @Throttle(IMPORT_LIMIT)
  @Post('import')
  importVcf(
    @CurrentAuth() a: AuthContext,
    @Body() dto: ImportVcfDto,
  ): Promise<ImportPlan> {
    return this.vcf.import(a.userId, dto.vcf);
  }

  /** Every contact not in the trash, as vCard 3.0. */
  @Throttle(IMPORT_LIMIT)
  @Get('export')
  @Header('Content-Type', 'text/vcard; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  exportVcf(@CurrentAuth() a: AuthContext): Promise<string> {
    return this.vcf.export(a.userId);
  }

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
