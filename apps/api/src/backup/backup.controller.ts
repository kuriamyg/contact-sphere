import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsObject } from 'class-validator';

import { type AuthContext, CurrentAuth } from '../auth/decorators';
import type { Archive } from './archive';
import { BackupService, type RestorePlan } from './backup.service';

/** The decrypted archive, as read by the browser from a backup file. */
class RestoreDto {
  @IsObject()
  archive!: Record<string, unknown>;
}

/**
 * Encrypted backups (ADR 0009). The archive leaves and returns only through
 * the owner's own signed-in web app, which does the encryption.
 */
@Controller('backup')
export class BackupController {
  constructor(private readonly backup: BackupService) {}

  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @Get()
  export(@CurrentAuth() a: AuthContext): Promise<Archive> {
    return this.backup.export(a.userId);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('restore/preview')
  @HttpCode(HttpStatus.OK)
  preview(
    @CurrentAuth() a: AuthContext,
    @Body() dto: RestoreDto,
  ): Promise<RestorePlan> {
    return this.backup.preview(a.userId, dto.archive);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('restore')
  @HttpCode(HttpStatus.OK)
  restore(
    @CurrentAuth() a: AuthContext,
    @Body() dto: RestoreDto,
  ): Promise<RestorePlan> {
    return this.backup.restore(a.userId, dto.archive);
  }
}
