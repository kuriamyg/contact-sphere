import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';

import { HealthService, type Readiness } from './health.service';

/**
 * Public by necessity (a monitor has no account), so both endpoints say as
 * little as possible: no version, commit, hostname or NODE_ENV — those are
 * free reconnaissance.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /**
   * Liveness: "is this process able to answer a request?" This is what
   * Render's health check points at. It deliberately touches nothing else: a
   * database blip must not make the platform restart a working process.
   */
  @Get()
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /**
   * Readiness: "can this service reach what it needs?" For humans and uptime
   * monitors — never wire a platform restart to it. 503 when degraded,
   * because "ready" is a claim a load balancer may act on.
   */
  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response): Promise<Readiness> {
    const result = await this.health.readiness();
    res.status(result.status === 'ok' ? 200 : 503);
    return result;
  }
}
