import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BreachedPasswords } from './breached-passwords';
import { LoginFailures } from './login-failures';
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
  ],
  exports: [SessionService],
})
export class AuthModule {}
