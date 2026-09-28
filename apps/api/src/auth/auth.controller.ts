import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import {
  AuthService,
  type Me,
  type MfaRequired,
  type SessionResult,
} from './auth.service';
import { type AuthContext, CurrentAuth, Public } from './decorators';
import { deviceLabel } from './device';
import {
  ChangePasswordDto,
  LoginDto,
  LocaleDto,
  ProfileDto,
  SetupDto,
} from './dto/credentials.dto';
import {
  DeleteAccountDto,
  MfaLoginDto,
  TotpCodeDto,
  TotpDisableDto,
} from './dto/totp.dto';
import type { SessionView } from './session.service';
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
  setup(
    @Body() dto: SetupDto,
    @Headers('x-client-ua') ua?: string,
  ): Promise<SessionResult> {
    return this.auth.setup(dto, deviceLabel(ua));
  }

  @Public()
  @Throttle(STRICT)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body() dto: LoginDto,
    @Headers('x-client-ua') ua?: string,
  ): Promise<SessionResult | MfaRequired> {
    return this.auth.login(dto, deviceLabel(ua));
  }

  @Public()
  @Throttle(STRICT)
  @Post('login/mfa')
  @HttpCode(HttpStatus.OK)
  loginMfa(
    @Body() dto: MfaLoginDto,
    @Headers('x-client-ua') ua?: string,
  ): Promise<SessionResult> {
    return this.auth.completeMfa(dto.challenge, dto.code, deviceLabel(ua));
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

  /** Devices signed in to this account. */
  @Get('sessions')
  sessions(
    @CurrentAuth() a: AuthContext,
  ): Promise<(SessionView & { current: boolean })[]> {
    return this.auth.sessionList(a.userId, a.sessionId);
  }

  /** Signs one other device out. */
  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  endSession(
    @CurrentAuth() a: AuthContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.auth.endSession(a.userId, a.sessionId, id);
  }

  /** Deletes the account and all its data, for good. */
  @Throttle(STRICT)
  @Post('account/delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAccount(
    @CurrentAuth() a: AuthContext,
    @Body() dto: DeleteAccountDto,
  ): Promise<void> {
    return this.auth.deleteAccount(a.userId, dto.password, dto.code);
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

  @Put('locale')
  @HttpCode(HttpStatus.NO_CONTENT)
  setLocale(
    @CurrentAuth() a: AuthContext,
    @Body() dto: LocaleDto,
  ): Promise<void> {
    return this.auth.setLocale(a.userId, dto.locale);
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
