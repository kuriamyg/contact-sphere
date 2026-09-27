import { Module } from '@nestjs/common';

import type { Env } from '../config/env';
import { ENV } from '../config/env.provider';
import { RememberModule } from '../remember/remember.module';
import { PushService } from './push.service';
import { ReachController } from './reach.controller';
import { ReachService } from './reach.service';
import { EMAIL_PROVIDER, emailProviderFor } from './email-provider';
import { SMS_PROVIDER, smsProviderFor } from './sms-provider';

@Module({
  imports: [RememberModule],
  controllers: [ReachController],
  providers: [
    ReachService,
    PushService,
    {
      provide: SMS_PROVIDER,
      inject: [ENV],
      useFactory: (env: Env) => smsProviderFor(env.sms),
    },
    {
      provide: EMAIL_PROVIDER,
      inject: [ENV],
      useFactory: (env: Env) => emailProviderFor(env.email),
    },
  ],
})
export class ReachModule {}
