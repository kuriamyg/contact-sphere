import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { writeVcard } from '../contacts/vcard/write';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  type AddMembersDto,
  type GroupInputDto,
  type GroupKind,
  MAX_MEMBERS,
} from './groups.dto';

export interface GroupSummary {
  id: string;
  name: string;
  kind: GroupKind;
  description: string | null;
  memberCount: number;
}

export interface GroupMemberView {
  contactId: string;
  displayName: string;
  organization: string | null;
  role: string | null;
  phone: { raw: string; e164: string | null } | null;
}

export interface GroupDetail extends GroupSummary {
  createdAt: string;
  members: GroupMemberView[];
}

/** Officials first, in the order chamas and churches list them. */
const ROLE_ORDER = [
  'chair',
  'chairperson',
  'chairman',
  'chairlady',
  'vice chair',
  'secretary',
  'treasurer',
  'pastor',
  'elder',
  'organiser',
  'organizer',
];
const roleRank = (r: string | null) =>
  r === null ? 1000 : ROLE_ORDER.indexOf(r) >= 0 ? ROLE_ORDER.indexOf(r) : 100;

const nameKey = (name: string) => name.toLowerCase();
const roleOf = (r?: string) => (r ? r.toLowerCase() : null);

/** Members shown are contacts not in the trash. */
const liveMember = { contact: { deletedAt: null } } as const;

/**
 * Communities (Phase 8): groups of the owner's contacts with roles. Every
 * query is scoped by owner; deleting a group never deletes contacts.
 * Audited by id and counts only.
 */
@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(ownerId: string): Promise<GroupSummary[]> {
    const rows = await this.prisma.group.findMany({
      where: { ownerId },
      orderBy: { nameKey: 'asc' },
      include: { _count: { select: { members: { where: liveMember } } } },
    });
    return rows.map((g) => ({
      id: g.id,
      name: g.name,
      kind: g.kind as GroupKind,
      description: g.description,
      memberCount: g._count.members,
    }));
  }

  async get(ownerId: string, id: string): Promise<GroupDetail> {
    const g = await this.prisma.group.findFirst({
      where: { id, ownerId },
      include: {
        members: {
          where: liveMember,
          include: {
            contact: {
              include: { phoneNumbers: { where: { position: 0 } } },
            },
          },
        },
      },
    });
    if (!g) throw new NotFoundException('Group not found.');
    const members = g.members
      .map((m) => ({
        contactId: m.contactId,
        displayName: m.contact.displayName,
        sortName: m.contact.sortName,
        organization: m.contact.organization,
        role: m.role,
        phone: m.contact.phoneNumbers[0]
          ? {
              raw: m.contact.phoneNumbers[0].raw,
              e164: m.contact.phoneNumbers[0].e164,
            }
          : null,
      }))
      .sort(
        (a, b) =>
          roleRank(a.role) - roleRank(b.role) ||
          (a.role ?? '').localeCompare(b.role ?? '') ||
          a.sortName.localeCompare(b.sortName),
      )
      .map((m): GroupMemberView => ({
        contactId: m.contactId,
        displayName: m.displayName,
        organization: m.organization,
        role: m.role,
        phone: m.phone,
      }));
    return {
      id: g.id,
      name: g.name,
      kind: g.kind as GroupKind,
      description: g.description,
      memberCount: members.length,
      createdAt: g.createdAt.toISOString(),
      members,
    };
  }

  async create(ownerId: string, dto: GroupInputDto): Promise<GroupSummary> {
    const g = await this.unique(() =>
      this.prisma.$transaction(async (tx) => {
        const created = await tx.group.create({
          data: { ownerId, ...fields(dto) },
        });
        await this.audit.record(
          'group.created',
          { actorUserId: ownerId, entityType: 'group', entityId: created.id },
          tx,
        );
        return created;
      }),
    );
    return { ...summary(g), memberCount: 0 };
  }

  async update(
    ownerId: string,
    id: string,
    dto: GroupInputDto,
  ): Promise<GroupSummary> {
    await this.unique(() =>
      this.prisma.$transaction(async (tx) => {
        const { count } = await tx.group.updateMany({
          where: { id, ownerId },
          data: fields(dto),
        });
        if (count === 0) throw new NotFoundException('Group not found.');
        await this.audit.record(
          'group.updated',
          { actorUserId: ownerId, entityType: 'group', entityId: id },
          tx,
        );
      }),
    );
    const g = await this.get(ownerId, id);
    return { ...summary(g), memberCount: g.memberCount };
  }

  /** The group goes; its contacts stay. */
  async remove(ownerId: string, id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.group.deleteMany({ where: { id, ownerId } });
      if (count === 0) throw new NotFoundException('Group not found.');
      await this.audit.record(
        'group.deleted',
        { actorUserId: ownerId, entityType: 'group', entityId: id },
        tx,
      );
    });
  }

  /** Adds contacts (already members are left as they are). */
  async addMembers(
    ownerId: string,
    id: string,
    dto: AddMembersDto,
  ): Promise<{ added: number }> {
    const ids = [...new Set(dto.contactIds)];
    return this.prisma.$transaction(async (tx) => {
      await this.requireGroup(tx, ownerId, id);
      const found = await tx.contact.count({
        where: { ownerId, id: { in: ids }, deletedAt: null },
      });
      if (found !== ids.length) {
        throw new NotFoundException('Some of those contacts do not exist.');
      }
      const { count } = await tx.groupMember.createMany({
        data: ids.map((contactId) => ({
          groupId: id,
          contactId,
          ownerId,
          role: roleOf(dto.role),
        })),
        skipDuplicates: true,
      });
      const total = await tx.groupMember.count({ where: { groupId: id } });
      if (total > MAX_MEMBERS) {
        throw new ConflictException(
          `A group can have up to ${MAX_MEMBERS} members.`,
        );
      }
      await this.audit.record(
        'group.members_added',
        {
          actorUserId: ownerId,
          entityType: 'group',
          entityId: id,
          metadata: { count },
        },
        tx,
      );
      return { added: count };
    });
  }

  async setRole(
    ownerId: string,
    id: string,
    contactId: string,
    role: string | undefined,
  ): Promise<void> {
    const { count } = await this.prisma.groupMember.updateMany({
      where: { groupId: id, contactId, ownerId },
      data: { role: roleOf(role) },
    });
    if (count === 0) throw new NotFoundException('Not a member of that group.');
  }

  async removeMember(
    ownerId: string,
    id: string,
    contactId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.groupMember.deleteMany({
        where: { groupId: id, contactId, ownerId },
      });
      if (count === 0) {
        throw new NotFoundException('Not a member of that group.');
      }
      await this.audit.record(
        'group.member_removed',
        { actorUserId: ownerId, entityType: 'group', entityId: id },
        tx,
      );
    });
  }

  /** The members as a .vcf, to share with a chama app or another phone. */
  async exportVcf(
    ownerId: string,
    id: string,
  ): Promise<{ name: string; vcf: string }> {
    const g = await this.prisma.group.findFirst({ where: { id, ownerId } });
    if (!g) throw new NotFoundException('Group not found.');
    const rows = await this.prisma.contact.findMany({
      where: {
        ownerId,
        deletedAt: null,
        memberships: { some: { groupId: id } },
      },
      orderBy: { sortName: 'asc' },
      include: {
        phoneNumbers: { orderBy: { position: 'asc' } },
        emailAddresses: { orderBy: { position: 'asc' } },
      },
    });
    await this.audit.record('group.exported', {
      actorUserId: ownerId,
      entityType: 'group',
      entityId: id,
      metadata: { count: rows.length },
    });
    const vcf = rows
      .map((c) =>
        writeVcard({
          ...c,
          birthday: c.birthday ? c.birthday.toISOString().slice(0, 10) : null,
          phones: c.phoneNumbers,
          emails: c.emailAddresses,
        }),
      )
      .join('');
    return { name: g.name, vcf };
  }

  /** The groups one contact is in, for the contact page. */
  async forContact(
    ownerId: string,
    contactId: string,
  ): Promise<
    { id: string; name: string; kind: GroupKind; role: string | null }[]
  > {
    const rows = await this.prisma.groupMember.findMany({
      where: { ownerId, contactId },
      include: { group: true },
      orderBy: { group: { nameKey: 'asc' } },
    });
    return rows.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      kind: m.group.kind as GroupKind,
      role: m.role,
    }));
  }

  private async requireGroup(
    tx: Prisma.TransactionClient,
    ownerId: string,
    id: string,
  ): Promise<void> {
    const g = await tx.group.findFirst({
      where: { id, ownerId },
      select: { id: true },
    });
    if (!g) throw new NotFoundException('Group not found.');
  }

  /** A second group with the same name is a conflict, not a crash. */
  private async unique<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('You already have a group with that name.');
      }
      throw e;
    }
  }
}

function fields(dto: GroupInputDto) {
  if (!dto.name) throw new BadRequestException('Give the group a name.');
  return {
    name: dto.name,
    nameKey: nameKey(dto.name),
    kind: dto.kind ?? 'other',
    description: dto.description ?? null,
  };
}

function summary(g: {
  id: string;
  name: string;
  kind: string;
  description: string | null;
}) {
  return {
    id: g.id,
    name: g.name,
    kind: g.kind as GroupKind,
    description: g.description,
  };
}
