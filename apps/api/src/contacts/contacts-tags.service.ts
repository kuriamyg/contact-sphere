import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normaliseTags, searchText } from './contact-names';

/** Saved searches per owner: plenty for chips, bounded for abuse. */
export const MAX_SAVED_SEARCHES = 50;

export interface SavedSearchView {
  id: string;
  name: string;
  query: string;
  tag: string | null;
}

const one = (tag: string) => normaliseTags([tag])[0];

/**
 * Tags across all of an owner's contacts (rename, delete) and saved
 * searches (Phase 7b). Audited with counts only: a tag or a search can say
 * something about people, so neither is written to the audit log.
 */
@Injectable()
export class ContactsTagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Renames a tag on every contact; merges into `to` if it exists. */
  async rename(
    ownerId: string,
    fromTag: string,
    toTag: string,
  ): Promise<{ updated: number }> {
    const from = one(fromTag);
    const to = one(toTag);
    if (!from || !to) throw new BadRequestException('Give both tag names.');
    if (from === to) throw new BadRequestException('The names are the same.');
    return this.rewrite(
      ownerId,
      from,
      'contact.tag_renamed',
      (tags) => normaliseTags(tags.map((t) => (t === from ? to : t))),
      (tx) =>
        tx.savedSearch.updateMany({
          where: { ownerId, tag: from },
          data: { tag: to },
        }),
    );
  }

  /** Removes a tag from every contact (the contacts stay). */
  async remove(ownerId: string, tag: string): Promise<{ updated: number }> {
    const t = one(tag);
    if (!t) throw new BadRequestException('Give a tag name.');
    return this.rewrite(
      ownerId,
      t,
      'contact.tag_deleted',
      (tags) => tags.filter((x) => x !== t),
      async (tx) => {
        // A saved search that was only this tag means nothing any more.
        await tx.savedSearch.deleteMany({
          where: { ownerId, tag: t, query: '' },
        });
        await tx.savedSearch.updateMany({
          where: { ownerId, tag: t },
          data: { tag: null },
        });
      },
    );
  }

  private async rewrite(
    ownerId: string,
    tag: string,
    action: 'contact.tag_renamed' | 'contact.tag_deleted',
    change: (tags: string[]) => string[],
    searches: (tx: Prisma.TransactionClient) => Promise<unknown>,
  ): Promise<{ updated: number }> {
    return this.prisma.$transaction(
      async (tx) => {
        const rows = await tx.contact.findMany({
          where: { ownerId, tags: { has: tag } },
        });
        if (rows.length === 0) throw new NotFoundException('No such tag.');
        for (const c of rows) {
          const tags = change(c.tags);
          await tx.contact.update({
            where: { id_ownerId: { id: c.id, ownerId } },
            // Not an edit of the person: "Edited" stays as it was.
            data: {
              tags,
              searchText: searchText({ ...c, tags }),
              updatedAt: c.updatedAt,
            },
          });
        }
        await searches(tx);
        await this.audit.record(
          action,
          { actorUserId: ownerId, metadata: { count: rows.length } },
          tx,
        );
        return { updated: rows.length };
      },
      { timeout: 60_000 },
    );
  }

  async listSearches(ownerId: string): Promise<SavedSearchView[]> {
    return this.prisma.savedSearch.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, query: true, tag: true },
    });
  }

  async saveSearch(
    ownerId: string,
    input: { name: string; query?: string; tag?: string },
  ): Promise<SavedSearchView> {
    const query = (input.query ?? '').trim().replace(/\s+/g, ' ');
    const tag = input.tag ? (one(input.tag) ?? null) : null;
    if (!query && !tag) {
      throw new BadRequestException('Search for something before saving it.');
    }
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.savedSearch.count({ where: { ownerId } });
      if (count >= MAX_SAVED_SEARCHES) {
        throw new ConflictException(
          `You can keep up to ${MAX_SAVED_SEARCHES} saved searches. Delete one first.`,
        );
      }
      try {
        const s = await tx.savedSearch.create({
          data: { ownerId, name: input.name, query, tag },
          select: { id: true, name: true, query: true, tag: true },
        });
        await this.audit.record(
          'search.saved',
          { actorUserId: ownerId, entityType: 'saved_search', entityId: s.id },
          tx,
        );
        return s;
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        ) {
          throw new ConflictException('A saved search has that name already.');
        }
        throw e;
      }
    });
  }

  async deleteSearch(ownerId: string, id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.savedSearch.deleteMany({
        where: { id, ownerId },
      });
      if (count === 0) throw new NotFoundException('Saved search not found.');
      await this.audit.record(
        'search.deleted',
        { actorUserId: ownerId, entityType: 'saved_search', entityId: id },
        tx,
      );
    });
  }
}
