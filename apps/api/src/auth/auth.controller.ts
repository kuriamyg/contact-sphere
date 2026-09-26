import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import {
  AuthService,
  type Me,
  type MfaRequired,
  type SessionResult,
} from './auth.service';
import { type AuthContext, CurrentAuth, Public } from './decorators';
import {
  ChangePasswordDto,
  LoginDto,
  ProfileDto,
  SetupDto,
} from './dto/credentials.dto';
import { MfaLoginDto, TotpCodeDto, TotpDisableDto } from './dto/totp.dto';
import { TotpService } from './totp.service';

/** Brute-force-sensitive endpoints: 5 attempts per minute per client IP. */
const STRICT = { default: { limit: 5, ttl: 60_000 } };

/**
 * Called only by the web app's server (BffGuard). The session token in a
 * response goes to that server, which stores it in an HttpOnly cookie; the
 * browser's JavaScript never sees it.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly totp: TotpService,
  ) {}

  @Public()
  @Get('setup')
  async setupStatus(): Promise<{ setupAvailable: boolean }> {
    return { setupAvailable: await this.auth.setupAvailable() };
  }

  @Public()
  @Throttle(STRICT)
  @Post('setup')
  setup(@Body() dto: SetupDto): Promise<SessionResult> {
    return this.auth.setup(dto);
  }

  @Public()
  @Throttle(STRICT)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<SessionResult | MfaRequired> {
    return this.auth.login(dto);
  }

  @Public()
  @Throttle(STRICT)
  @Post('login/mfa')
  @HttpCode(HttpStatus.OK)
  loginMfa(@Body() dto: MfaLoginDto): Promise<SessionResult> {
    return this.auth.completeMfa(dto.challenge, dto.code);
  }

  @Throttle(STRICT)
  @Post('totp/setup')
  @HttpCode(HttpStatus.OK)
  totpSetup(
    @CurrentAuth() a: AuthContext,
  ): Promise<{ secret: string; uri: string }> {
    return this.totp.setup(a.userId);
  }

  @Throttle(STRICT)
  @Post('totp/enable')
  @HttpCode(HttpStatus.OK)
  totpEnable(
    @CurrentAuth() a: AuthContext,
    @Body() dto: TotpCodeDto,
  ): Promise<{ recoveryCodes: string[] }> {
    return this.totp.enable(a.userId, a.sessionId, dto.code);
  }

  @Throttle(STRICT)
  @Post('totp/disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  totpDisable(
    @CurrentAuth() a: AuthContext,
    @Body() dto: TotpDisableDto,
  ): Promise<void> {
    return this.totp.disable(a.userId, dto.password, dto.code);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentAuth() a: AuthContext): Promise<void> {
    return this.auth.logout(a.userId, a.sessionId);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  logoutAll(@CurrentAuth() a: AuthContext): Promise<void> {
    return this.auth.logoutAll(a.userId);
  }

  @Post('profile')
  @HttpCode(HttpStatus.OK)
  updateProfile(
    @CurrentAuth() a: AuthContext,
    @Body() dto: ProfileDto,
  ): Promise<Me> {
    return this.auth.updateProfile(a.userId, dto.displayName);
  }

  @Get('me')
  me(@CurrentAuth() a: AuthContext): Promise<Me> {
    return this.auth.me(a.userId);
  }

  @Throttle(STRICT)
  @Post('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @CurrentAuth() a: AuthContext,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.auth.changePassword(a.userId, a.sessionId, dto);
  }
}
