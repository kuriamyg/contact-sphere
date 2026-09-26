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
  ContactsMergeService,
  type DuplicateView,
  type MergePreview,
} from './contacts-merge.service';
import {
  type SavedSearchView,
  ContactsTagsService,
} from './contacts-tags.service';
import {
  type ContactDetail,
  type ContactPage,
  ContactsService,
} from './contacts.service';
import {
  ContactInputDto,
  ContactPairDto,
  CreateContactDto,
  ImportVcfDto,
  ListContactsQueryDto,
  MergeDto,
  RenameTagDto,
  SavedSearchDto,
  TagDto,
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
    private readonly merges: ContactsMergeService,
    private readonly tagOps: ContactsTagsService,
  ) {}

  /** Possible duplicates, with reasons. Changes nothing. */
  @Get('duplicates')
  duplicates(
    @CurrentAuth() a: AuthContext,
  ): Promise<{ pairs: DuplicateView[]; total: number }> {
    return this.merges.duplicates(a.userId);
  }

  /** "Not the same person": the pair is not suggested again. */
  @Post('duplicates/dismiss')
  @HttpCode(HttpStatus.NO_CONTENT)
  dismiss(
    @CurrentAuth() a: AuthContext,
    @Body() dto: ContactPairDto,
  ): Promise<void> {
    return this.merges.dismiss(a.userId, dto.keepId, dto.mergeId);
  }

  /** Both contacts, their conflicts, and the default result. Changes nothing. */
  @Post('merge/preview')
  @HttpCode(HttpStatus.OK)
  mergePreview(
    @CurrentAuth() a: AuthContext,
    @Body() dto: ContactPairDto,
  ): Promise<MergePreview> {
    return this.merges.preview(a.userId, dto.keepId, dto.mergeId);
  }

  @Post('merge')
  merge(
    @CurrentAuth() a: AuthContext,
    @Body() dto: MergeDto,
  ): Promise<{ survivorId: string; mergeRecordId: string }> {
    return this.merges.merge(
      a.userId,
      dto.keepId,
      dto.mergeId,
      dto.choices ?? {},
    );
  }

  @Post('merges/:id/undo')
  @HttpCode(HttpStatus.OK)
  undoMerge(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
  ): Promise<{ survivorId: string; mergedId: string }> {
    return this.merges.undo(a.userId, id);
  }

  /** Merges into this contact that can still be undone. */
  @Get(':id/merges')
  undoableMerges(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
  ): Promise<{ id: string; mergedName: string; createdAt: string }[]> {
    return this.merges.undoableMerges(a.userId, id);
  }

  /** The owner's tags with how many contacts carry each, most used first. */
  @Get('tags')
  tags(
    @CurrentAuth() a: AuthContext,
  ): Promise<{ tag: string; count: number }[]> {
    return this.contacts.tags(a.userId);
  }

  /** Renames a tag on every contact (merging into an existing one). */
  @Post('tags/rename')
  @HttpCode(HttpStatus.OK)
  renameTag(
    @CurrentAuth() a: AuthContext,
    @Body() dto: RenameTagDto,
  ): Promise<{ updated: number }> {
    return this.tagOps.rename(a.userId, dto.from, dto.to);
  }

  /** Removes a tag from every contact; the contacts stay. */
  @Post('tags/delete')
  @HttpCode(HttpStatus.OK)
  deleteTag(
    @CurrentAuth() a: AuthContext,
    @Body() dto: TagDto,
  ): Promise<{ updated: number }> {
    return this.tagOps.remove(a.userId, dto.tag);
  }

  @Get('searches')
  searches(@CurrentAuth() a: AuthContext): Promise<SavedSearchView[]> {
    return this.tagOps.listSearches(a.userId);
  }

  @Post('searches')
  saveSearch(
    @CurrentAuth() a: AuthContext,
    @Body() dto: SavedSearchDto,
  ): Promise<SavedSearchView> {
    return this.tagOps.saveSearch(a.userId, dto);
  }

  @Delete('searches/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSearch(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
  ): Promise<void> {
    return this.tagOps.deleteSearch(a.userId, id);
  }

  @Get('stats')
  stats(
    @CurrentAuth() a: AuthContext,
  ): Promise<{ active: number; archived: number; trash: number }> {
    return this.contacts.stats(a.userId);
  }

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
    @Body() dto: CreateContactDto,
  ): Promise<ContactDetail> {
    const { id, ...input } = dto;
    return this.contacts.create(a.userId, input, id);
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
