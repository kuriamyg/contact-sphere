import { Module } from '@nestjs/common';

import { ContactsController } from './contacts.controller';
import { ContactsImportService } from './contacts-import.service';
import { ContactsService } from './contacts.service';

@Module({
  controllers: [ContactsController],
  providers: [ContactsService, ContactsImportService],
})
export class ContactsModule {}
