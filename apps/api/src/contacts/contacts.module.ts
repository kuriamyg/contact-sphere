import { Module } from '@nestjs/common';

import { ContactsController } from './contacts.controller';
import { ContactsImportService } from './contacts-import.service';
import { ContactsMergeService } from './contacts-merge.service';
import { ContactsService } from './contacts.service';

@Module({
  controllers: [ContactsController],
  providers: [ContactsService, ContactsImportService, ContactsMergeService],
})
export class ContactsModule {}
