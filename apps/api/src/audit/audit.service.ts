import { Injectable } from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Dotted, lower-case action names. The database rejects anything else. */
export type AuditAction =
  | 'auth.setup_completed'
  | 'auth.login_succeeded'
  | 'auth.login_failed'
  | 'auth.logout'
  | 'auth.logout_all'
  | 'auth.password_changed'
  | 'auth.mfa_challenged'
  | 'auth.mfa_failed'
  | 'auth.totp_enabled'
  | 'auth.totp_disabled'
  | 'auth.recovery_code_used'
  | 'auth.profile_updated'
  | 'contact.created'
  | 'contact.updated'
  | 'contact.archived'
  | 'contact.unarchived'
  | 'contact.trashed'
  | 'contact.restored'
  | 'contact.deleted'
  | 'contact.trash_emptied'
  | 'contact.trash_purged'
  | 'contact.imported'
  | 'contact.exported'
  | 'contact.merged'
  | 'contact.merge_undone'
  | 'contact.duplicate_dismissed'
  | 'contact.tag_renamed'
  | 'contact.tag_deleted'
  | 'search.saved'
  | 'search.deleted'
  | 'group.created'
  | 'group.updated'
  | 'group.deleted'
  | 'group.members_added'
  | 'group.member_removed'
  | 'group.exported'
  | 'contact.keep_in_touch_set'
  | 'follow_up.created'
  | 'follow_up.deleted';

export interface AuditEntry {
  actorUserId?: string | null;
  entityType?: string;
  entityId?: string;
  /**
   * Non-personal facts only: counts, field NAMES, reasons as codes. Never
   * emails, names, numbers or notes (docs/security/threat-model.md §3).
   */
  metadata?: Record<string, string | number | boolean>;
}

type Db = Pick<PrismaService, 'auditLog'> | Prisma.TransactionClient;

/** Writes to the append-only audit log (ADR 0012). */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    action: AuditAction,
    entry: AuditEntry = {},
    db: Db = this.prisma,
  ): Promise<void> {
    await db.auditLog.create({
      data: {
        action,
        actorUserId: entry.actorUserId ?? null,
        entityType: entry.entityType ?? null,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata ?? {},
      },
    });
  }
}
