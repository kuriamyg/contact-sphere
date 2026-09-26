import { BadRequestException, Injectable } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { deriveDisplayName, searchText, sortKey } from './contact-names';
import { normalisePhone } from './phone';
import { uuidv7 } from './uuid';
import { type ParsedCard, type ParseResult, parseVcf } from './vcard/parse';
import { writeVcard } from './vcard/write';

/** Per import. A personal address book is far below this. */
export const MAX_IMPORT_CARDS = 5_000;
/** How many of the contacts to be imported the preview lists by name. */
const PREVIEW_LIMIT = 1_000;

export interface ImportPlan {
  /** Cards found in the file. */
  cards: number;
  /** Will be added. */
  toImport: number;
  /** Same name and every number/email already saved on one contact. */
  alreadySaved: number;
  /** The same card appears earlier in the file. */
  repeatedInFile: number;
  /** No name, number or email at all. */
  empty: number;
  warnings: ParseResult['warnings'];
  /** The first contacts to be added, for the owner to check. */
  preview: { displayName: string; phone: string | null }[];
}

interface Candidate {
  data: {
    id: string;
    displayName: string;
    sortName: string;
    searchText: string;
    givenName: string | null;
    familyName: string | null;
    nickname: string | null;
    organization: string | null;
    jobTitle: string | null;
    notes: string | null;
    birthday: Date | null;
  };
  phones: ReturnType<typeof normalisePhone>[];
  labels: (string | undefined)[];
  emails: { address: string; label?: string }[];
}

/** What identifies a number for "already saved": E.164, else its digits. */
const phoneKey = (p: { e164: string | null; raw: string; digits: string }) =>
  p.e164 ?? `raw:${p.digits || p.raw}`;

interface Known {
  phones: Set<string>;
  emails: Set<string>;
}

/**
 * .vcf import and export (Phase 5). Import never merges or overwrites: an
 * exact repeat is skipped, everything else is added, and possible
 * duplicates are left for the owner to review and merge (never automatic).
 */
@Injectable()
export class ContactsImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async preview(ownerId: string, vcf: string): Promise<ImportPlan> {
    return (await this.plan(ownerId, vcf)).plan;
  }

  async import(ownerId: string, vcf: string): Promise<ImportPlan> {
    const { plan, candidates } = await this.plan(ownerId, vcf);
    if (candidates.length === 0) return plan;
    const now = new Date();
    await this.prisma.$transaction(
      async (tx) => {
        await tx.contact.createMany({
          data: candidates.map((c) => ({
            ...c.data,
            ownerId,
            createdAt: now,
            updatedAt: now,
          })),
        });
        await tx.phoneNumber.createMany({
          data: candidates.flatMap((c) =>
            c.phones.map((p, position) => ({
              ownerId,
              contactId: c.data.id,
              raw: p.raw,
              e164: p.e164,
              digits: p.digits,
              label: c.labels[position] ?? null,
              position,
            })),
          ),
        });
        await tx.emailAddress.createMany({
          data: candidates.flatMap((c) =>
            c.emails.map((e, position) => ({
              ownerId,
              contactId: c.data.id,
              address: e.address,
              label: e.label ?? null,
              position,
            })),
          ),
        });
        await this.audit.record(
          'contact.imported',
          {
            actorUserId: ownerId,
            metadata: {
              imported: plan.toImport,
              alreadySaved: plan.alreadySaved,
              repeatedInFile: plan.repeatedInFile,
              empty: plan.empty,
            },
          },
          tx,
        );
      },
      { timeout: 60_000 },
    );
    return plan;
  }

  /** Every contact not in the trash, as one .vcf file, A–Z. */
  async export(ownerId: string): Promise<string> {
    const rows = await this.prisma.contact.findMany({
      where: { ownerId, deletedAt: null },
      orderBy: [{ sortName: 'asc' }, { id: 'asc' }],
      include: {
        phoneNumbers: { orderBy: { position: 'asc' } },
        emailAddresses: { orderBy: { position: 'asc' } },
      },
    });
    await this.audit.record('contact.exported', {
      actorUserId: ownerId,
      metadata: { count: rows.length },
    });
    return rows
      .map((c) =>
        writeVcard({
          ...c,
          birthday: c.birthday ? c.birthday.toISOString().slice(0, 10) : null,
          phones: c.phoneNumbers,
          emails: c.emailAddresses,
        }),
      )
      .join('');
  }

  private async plan(
    ownerId: string,
    vcf: string,
  ): Promise<{ plan: ImportPlan; candidates: Candidate[] }> {
    const parsed = parseVcf(vcf);
    if (parsed.cardCount === 0) {
      throw new BadRequestException(
        'No contacts found. Choose a .vcf (vCard) file exported from your phone or address book.',
      );
    }
    if (parsed.cardCount > MAX_IMPORT_CARDS) {
      throw new BadRequestException(
        `That file has ${parsed.cardCount} contacts; up to ${MAX_IMPORT_CARDS} can be imported at once.`,
      );
    }

    // Saved contacts by sort name; the trash does not count as saved.
    const existing = new Map<string, Known[]>();
    const saved = await this.prisma.contact.findMany({
      where: { ownerId, deletedAt: null },
      select: {
        sortName: true,
        phoneNumbers: { select: { raw: true, e164: true, digits: true } },
        emailAddresses: { select: { address: true } },
      },
    });
    for (const s of saved) {
      add(existing, s.sortName, {
        phones: new Set(s.phoneNumbers.map(phoneKey)),
        emails: new Set(s.emailAddresses.map((e) => e.address)),
      });
    }
    const inFile = new Map<string, Known[]>();

    const plan: ImportPlan = {
      cards: parsed.cardCount,
      toImport: 0,
      alreadySaved: 0,
      repeatedInFile: 0,
      empty: 0,
      warnings: parsed.warnings,
      preview: [],
    };
    const candidates: Candidate[] = [];
    for (const card of parsed.cards) {
      const c = candidate(card);
      if (!c) {
        plan.empty++;
        continue;
      }
      const known: Known = {
        phones: new Set(c.phones.map(phoneKey)),
        emails: new Set(c.emails.map((e) => e.address)),
      };
      if (covered(existing, c.data.sortName, known)) {
        plan.alreadySaved++;
      } else if (covered(inFile, c.data.sortName, known)) {
        plan.repeatedInFile++;
      } else {
        add(inFile, c.data.sortName, known);
        candidates.push(c);
        if (plan.preview.length < PREVIEW_LIMIT) {
          plan.preview.push({
            displayName: c.data.displayName,
            phone: c.phones[0]?.raw ?? null,
          });
        }
      }
    }
    plan.toImport = candidates.length;
    return { plan, candidates };
  }
}

function add(index: Map<string, Known[]>, key: string, k: Known): void {
  index.set(key, [...(index.get(key) ?? []), k]);
}

/** Is everything on this card already on one known contact of the same name? */
function covered(index: Map<string, Known[]>, key: string, k: Known): boolean {
  return (index.get(key) ?? []).some(
    (x) =>
      [...k.phones].every((p) => x.phones.has(p)) &&
      [...k.emails].every((e) => x.emails.has(e)),
  );
}

function candidate(card: ParsedCard): Candidate | null {
  const displayName = deriveDisplayName({
    ...card,
    firstPhone: card.phones[0]?.raw,
    firstEmail: card.emails[0]?.address,
  }).slice(0, 200);
  if (!displayName) return null;
  return {
    data: {
      id: uuidv7(),
      displayName,
      sortName: sortKey(displayName),
      searchText: searchText({ ...card, displayName }),
      givenName: card.givenName ?? null,
      familyName: card.familyName ?? null,
      nickname: card.nickname ?? null,
      organization: card.organization ?? null,
      jobTitle: card.jobTitle ?? null,
      notes: card.notes ?? null,
      birthday: card.birthday ? new Date(`${card.birthday}T00:00:00Z`) : null,
    },
    phones: card.phones.map((p) => normalisePhone(p.raw)),
    labels: card.phones.map((p) => p.label),
    emails: card.emails,
  };
}
