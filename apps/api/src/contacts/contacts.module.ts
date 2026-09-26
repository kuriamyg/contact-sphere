import { Module } from '@nestjs/common';

import { ContactsController } from './contacts.controller';
import { ContactsImportService } from './contacts-import.service';
import { ContactsMergeService } from './contacts-merge.service';
import { ContactsTagsService } from './contacts-tags.service';
import { ContactsService } from './contacts.service';

@Module({
  controllers: [ContactsController],
  providers: [
    ContactsService,
    ContactsImportService,
    ContactsMergeService,
    ContactsTagsService,
  ],
})
export class ContactsModule {}
