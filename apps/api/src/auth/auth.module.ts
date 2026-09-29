import { Module } from '@nestjs/common';

import type { Env } from '../config/env';
import { ENV } from '../config/env.provider';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BreachedPasswords } from './breached-passwords';
import { LoginFailures } from './login-failures';
import { GOOGLE_OIDC, googleOidcFor } from './google-oidc';
import { OTP_SMS, otpSmsFor } from './otp-sms';
import { PhoneCodes } from './phone-codes.service';
import { SessionService } from './session.service';
import { TotpService } from './totp.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    TotpService,
    LoginFailures,
    BreachedPasswords,
    PhoneCodes,
    {
      provide: OTP_SMS,
      inject: [ENV],
      useFactory: (env: Env) => otpSmsFor(env.otpSms),
    },
    {
      provide: GOOGLE_OIDC,
      inject: [ENV],
      useFactory: (env: Env) => googleOidcFor(env.google),
    },
  ],
  exports: [SessionService],
})
export class AuthModule {}
