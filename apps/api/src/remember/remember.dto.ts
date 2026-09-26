import { Transform } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';

import { KEEP_IN_TOUCH_DAYS } from './dates';

export class KeepInTouchDto {
  /** Absent or null turns the reminder off. */
  @IsOptional()
  @IsIn(KEEP_IN_TOUCH_DAYS)
  days?: number | null;
}

/** "In touch" recorded offline says when it really happened. */
export class ContactedDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  at?: string;
}

export class FollowUpDto {
  /** Made on the owner's device for offline changes: sending twice is safe. */
  @IsOptional()
  @IsUUID()
  id?: string;

  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    message: 'dueOn must be a date as YYYY-MM-DD',
  })
  dueOn!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString()
  @Length(1, 200)
  note!: string;
}
