import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';

@Module({
  imports: [BillingModule],
  controllers: [BackupController],
  providers: [BackupService],
})
export class BackupModule {}
