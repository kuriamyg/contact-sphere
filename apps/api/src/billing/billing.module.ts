import { Module } from '@nestjs/common';

import type { Env } from '../config/env';
import { ENV } from '../config/env.provider';
import { BillingController, OperatorController } from './billing.controller';
import { BillingService } from './billing.service';
import { MPESA, mpesaFor } from './mpesa';
import { Plans } from './plans.service';

@Module({
  controllers: [BillingController, OperatorController],
  providers: [
    BillingService,
    Plans,
    {
      provide: MPESA,
      inject: [ENV],
      useFactory: (env: Env) => mpesaFor(env.billing.mpesa),
    },
  ],
  exports: [Plans],
})
export class BillingModule {}
