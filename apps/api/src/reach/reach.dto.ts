import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

/** A phone's Web Push subscription, flattened. */
export class PushDeviceDto {
  @IsString()
  @MaxLength(1000)
  @Matches(/^https:\/\/[^\s]+$/, { message: 'endpoint must be an https URL' })
  endpoint!: string;

  /** The phone's public key and auth secret, base64url. */
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{80,100}={0,2}$/)
  p256dh!: string;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]{16,32}={0,2}$/)
  auth!: string;
}

export class PushEndpointDto {
  @IsString()
  @MaxLength(1000)
  endpoint!: string;
}

export const MAX_SMS_LENGTH = 900;

export class GroupSmsDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, MAX_SMS_LENGTH)
  message!: string;
}

export class CardDto {
  /** The owner's own contact; null clears the card. */
  @IsOptional()
  @IsUUID()
  contactId?: string | null;
}

export class EmailOptInDto {
  @IsBoolean()
  on!: boolean;
}
