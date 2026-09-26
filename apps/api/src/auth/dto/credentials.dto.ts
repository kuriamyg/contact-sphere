import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

import { PASSWORD_MAX } from '../auth.constants';

const normaliseEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class LoginDto {
  @Transform(normaliseEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  // Only length-capped here: the policy applies to NEW passwords, and a
  // policy error at login would leak which rule an old password breaks.
  @IsString()
  @Length(1, PASSWORD_MAX)
  password!: string;
}

export class SetupDto {
  @IsString()
  @Length(32, 256)
  setupToken!: string;

  @Transform(normaliseEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @Length(1, PASSWORD_MAX)
  password!: string;
}

export class ChangePasswordDto {
  @IsString()
  @Length(1, PASSWORD_MAX)
  currentPassword!: string;

  @IsString()
  @Length(1, PASSWORD_MAX)
  newPassword!: string;
}

export class ProfileDto {
  /** Blank or absent clears the name. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const t = value.trim().replace(/\s+/g, ' ');
    return t === '' ? undefined : t;
  })
  @IsString()
  @MaxLength(100)
  displayName?: string;
}
