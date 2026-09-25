import { Controller, Get } from '@nestjs/common';

/**
 * Liveness: "is this process able to answer a request?"
 *
 * This is what Render's health check points at. It deliberately touches
 * nothing else — once the database exists (Phase 2), a database blip must not
 * make the platform restart a process that is working fine; that belongs in a
 * separate readiness endpoint.
 *
 * It is public (a monitor has no account), so it says as little as possible:
 * no version, commit, hostname or NODE_ENV — those are free reconnaissance.
 */
@Controller('health')
export class HealthController {
  @Get()
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
