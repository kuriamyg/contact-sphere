import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';

import { KEEP_IN_TOUCH_DAYS } from './dates';

export class KeepInTouchDto {
  /** Absent or null turns the reminder off. */
  @IsOptional()
  @IsIn(KEEP_IN_TOUCH_DAYS)
  days?: number | null;
}

export class FollowUpDto {
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
