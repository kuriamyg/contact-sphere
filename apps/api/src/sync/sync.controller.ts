import { Controller, Get, Header } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { type AuthContext, CurrentAuth } from '../auth/decorators';
import { type Snapshot, SyncService } from './sync.service';

/**
 * The owner's offline copy. Refreshed by the app at most every few minutes,
 * so a low limit costs nothing and stops scraping with a stolen session.
 */
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  @Get('snapshot')
  @Header('Cache-Control', 'no-store')
  snapshot(@CurrentAuth() a: AuthContext): Promise<Snapshot> {
    return this.sync.snapshot(a.userId);
  }
}
