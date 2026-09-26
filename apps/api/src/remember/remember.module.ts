import { Module } from '@nestjs/common';

import { RememberController } from './remember.controller';
import { RememberService } from './remember.service';

@Module({
  controllers: [RememberController],
  providers: [RememberService],
})
export class RememberModule {}
