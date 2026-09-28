import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [BillingModule],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule {}
