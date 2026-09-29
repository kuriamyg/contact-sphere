import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { Plans } from '../billing/plans.service';
import { fold } from '../contacts/contact-names';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { type RelationshipKind, type Role, roleFor, toRow } from './kinds';
import { type MapEdge, neighbourhood, pickFocus } from './map';

export interface RelationshipView {
  id: string;
  /** How the other contact relates to this one ("parent", "introducedBy"…). */
  role: Role;
  label: string | null;
  other: { id: string; displayName: string };
}

export interface RelationshipMap {
  focusId: string | null;
  people: { id: string; displayName: string; depth: number }[];
  links: MapEdge[];
  /** More people are linked than the map draws at once. */
  truncated: boolean;
}

export const PLUS_MAP = 'The relationship map is part of Plus.';

export interface Suggestion {
  kind: 'relative' | 'introduced';
  /** For "introduced": `from` introduced the owner to `to`. */
  from: { id: string; displayName: string };
  to: { id: string; displayName: string };
  reason: 'same_surname' | 'met_through';
}

const NOT_FOUND = 'Contact not found.';
/** A surname shared by more people than this is too common to suggest. */
const MAX_SURNAME_GROUP = 6;
const MAX_SUGGESTIONS = 20;
const MAX_PER_CONTACT = 200;

const tidyLabel = (l?: string | null) => {
  const t = l?.trim().replace(/\s+/g, ' ').toLowerCase();
  return t ? t.slice(0, 40) : null;
};

/** Contacts shown are those not in the trash. */
const live = { deletedAt: null } as const;

/**
 * Relationships between the owner's contacts (P6, ADR 0023). Owner-scoped
 * everywhere; the database also refuses links across owners. Suggestions
 * are only ever suggestions: nothing is linked until the owner says so.
 */
@Injectable()
export class RelationshipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly plans: Plans,
  ) {}

  /**
   * The map around one person (P6b, Plus): them, their links and their
   * links' links, drawn by the page. Without a focus: the owner's card, or
   * whoever has the most links.
   */
  async map(ownerId: string, focus?: string): Promise<RelationshipMap> {
    await this.plans.requirePlus(ownerId, PLUS_MAP);
    if (focus) await this.requireLive(ownerId, focus);
    const [rows, user] = await Promise.all([
      this.prisma.relationship.findMany({
        where: { ownerId, from: live, to: live },
        select: { id: true, fromId: true, toId: true, kind: true, label: true },
        orderBy: { createdAt: 'asc' },
        take: 20_000,
      }),
      this.prisma.user.findUnique({
        where: { id: ownerId },
        select: { cardContactId: true },
      }),
    ]);
    const edges = rows as MapEdge[];
    const focusId = pickFocus(
      edges,
      focus ?? null,
      user?.cardContactId ?? null,
    );
    if (!focusId)
      return { focusId: null, people: [], links: [], truncated: false };
    const n = neighbourhood(edges, focusId);
    const names = await this.prisma.contact.findMany({
      where: { ownerId, id: { in: [...n.depth.keys()] }, ...live },
      select: { id: true, displayName: true },
    });
    const people = names
      .map((c) => ({ ...c, depth: n.depth.get(c.id)! }))
      .sort(
        (a, b) =>
          a.depth - b.depth || a.displayName.localeCompare(b.displayName),
      );
    return { focusId, people, links: n.edges, truncated: n.truncated };
  }

  /** Everyone linked to a contact, and how, from that contact's side. */
  async forContact(
    ownerId: string,
    contactId: string,
  ): Promise<RelationshipView[]> {
    await this.requireLive(ownerId, contactId);
    const pick = { select: { id: true, displayName: true } } as const;
    const rows = await this.prisma.relationship.findMany({
      where: {
        ownerId,
        OR: [
          { fromId: contactId, to: live },
          { toId: contactId, from: live },
        ],
      },
      include: { from: pick, to: pick },
      orderBy: { createdAt: 'asc' },
      take: MAX_PER_CONTACT,
    });
    return rows.map((r) => {
      const otherIsFrom = r.toId === contactId;
      return {
        id: r.id,
        role: roleFor(r.kind as RelationshipKind, otherIsFrom),
        label: r.label,
        other: otherIsFrom ? r.from : r.to,
      };
    });
  }

  /** "Y (otherId) is X's <role>". */
  async add(
    ownerId: string,
    contactId: string,
    dto: { otherId: string; role: Role; label?: string },
  ): Promise<RelationshipView> {
    if (dto.otherId === contactId) {
      throw new BadRequestException('Choose someone other than this contact.');
    }
    await this.requireLive(ownerId, contactId);
    const other = await this.prisma.contact.findFirst({
      where: { id: dto.otherId, ownerId, ...live },
      select: { id: true, displayName: true },
    });
    if (!other) throw new NotFoundException(NOT_FOUND);
    const row = toRow(dto.role, contactId, dto.otherId);
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const r = await tx.relationship.create({
          data: { ownerId, ...row, label: tidyLabel(dto.label) },
          select: { id: true, label: true },
        });
        await this.audit.record(
          'relationship.added',
          {
            actorUserId: ownerId,
            entityType: 'relationship',
            entityId: r.id,
            metadata: { kind: row.kind },
          },
          tx,
        );
        return r;
      });
      return { id: created.id, role: dto.role, label: created.label, other };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Those two are already linked that way.');
      }
      throw e;
    }
  }

  async remove(ownerId: string, id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.relationship.deleteMany({
        where: { id, ownerId },
      });
      if (count === 0) throw new NotFoundException('Link not found.');
      await this.audit.record(
        'relationship.removed',
        { actorUserId: ownerId, entityType: 'relationship', entityId: id },
        tx,
      );
    });
  }

  /**
   * Possible links for the owner to confirm: "X introduced you to Y" when
   * Y's "met through" is exactly X's name; "relatives?" for people sharing
   * an uncommon surname. Never pairs already linked or dismissed.
   */
  async suggestions(ownerId: string): Promise<Suggestion[]> {
    const [contacts, links, dismissed] = await Promise.all([
      this.prisma.contact.findMany({
        where: { ownerId, ...live },
        select: {
          id: true,
          displayName: true,
          familyName: true,
          metThrough: true,
        },
        orderBy: { sortName: 'asc' },
        take: 5000,
      }),
      this.prisma.relationship.findMany({
        where: { ownerId },
        select: { fromId: true, toId: true },
      }),
      this.prisma.relationshipDismissal.findMany({
        where: { ownerId },
        select: { aId: true, bId: true, kind: true },
      }),
    ]);
    const pair = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
    const linked = new Set(links.map((l) => pair(l.fromId, l.toId)));
    const skipped = new Set(
      dismissed.map((d) => `${d.kind}:${pair(d.aId, d.bId)}`),
    );
    const view = (c: (typeof contacts)[number]) => ({
      id: c.id,
      displayName: c.displayName,
    });
    const out: Suggestion[] = [];
    const ok = (kind: Suggestion['kind'], a: string, b: string) =>
      !linked.has(pair(a, b)) && !skipped.has(`${kind}:${pair(a, b)}`);

    // "Met through Wanjiru Kamau" and exactly one contact of that name.
    const byName = new Map<string, (typeof contacts)[number][]>();
    for (const c of contacts) {
      const key = fold(c.displayName).replace(/\s+/g, ' ').trim();
      byName.set(key, [...(byName.get(key) ?? []), c]);
    }
    for (const c of contacts) {
      if (!c.metThrough) continue;
      const found = byName.get(fold(c.metThrough).replace(/\s+/g, ' ').trim());
      if (found?.length !== 1 || found[0].id === c.id) continue;
      if (ok('introduced', found[0].id, c.id)) {
        out.push({
          kind: 'introduced',
          from: view(found[0]),
          to: view(c),
          reason: 'met_through',
        });
      }
    }

    // Shared, uncommon surnames.
    const bySurname = new Map<string, (typeof contacts)[number][]>();
    for (const c of contacts) {
      const s = c.familyName ? fold(c.familyName).trim() : '';
      if (s.length >= 3) bySurname.set(s, [...(bySurname.get(s) ?? []), c]);
    }
    for (const group of bySurname.values()) {
      if (group.length < 2 || group.length > MAX_SURNAME_GROUP) continue;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          if (ok('relative', group[i].id, group[j].id)) {
            out.push({
              kind: 'relative',
              from: view(group[i]),
              to: view(group[j]),
              reason: 'same_surname',
            });
          }
        }
      }
    }
    return out.slice(0, MAX_SUGGESTIONS);
  }

  /** "Not related": this suggestion is not made again. */
  async dismiss(
    ownerId: string,
    dto: { kind: 'relative' | 'introduced'; aId: string; bId: string },
  ): Promise<void> {
    if (dto.aId === dto.bId) throw new BadRequestException();
    // Stored smaller id first, like two-way links.
    const [aId, bId] =
      dto.aId < dto.bId ? [dto.aId, dto.bId] : [dto.bId, dto.aId];
    const found = await this.prisma.contact.count({
      where: { ownerId, id: { in: [aId, bId] } },
    });
    if (found !== 2) throw new NotFoundException(NOT_FOUND);
    await this.prisma.relationshipDismissal.upsert({
      where: {
        ownerId_aId_bId_kind: { ownerId, aId, bId, kind: dto.kind },
      },
      create: { ownerId, aId, bId, kind: dto.kind },
      update: {},
    });
  }

  private async requireLive(ownerId: string, id: string): Promise<void> {
    const n = await this.prisma.contact.count({
      where: { id, ownerId, ...live },
    });
    if (n === 0) throw new NotFoundException(NOT_FOUND);
  }
}
