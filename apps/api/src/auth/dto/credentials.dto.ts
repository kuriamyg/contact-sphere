import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

import { PASSWORD_MAX } from '../auth.constants';

const normaliseEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** Sign in with an email or a phone number (B6) — one of the two. */
export class LoginDto {
  @IsOptional()
  @Transform(normaliseEmail)
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

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

export const LOCALES = ['en', 'sw'] as const;

export class LocaleDto {
  @IsIn(LOCALES)
  locale!: (typeof LOCALES)[number];
}

/** Ask for an SMS code (sign-up or reset). */
export class PhoneCodeDto {
  @IsString()
  @MaxLength(32)
  phone!: string;

  @IsOptional()
  @IsIn(LOCALES)
  locale?: 'en' | 'sw';
}

/** Finish sign-up: the code proves the number (B6). */
export class SignupDto {
  @IsString()
  @MaxLength(32)
  phone!: string;

  @IsString()
  @Length(6, 12)
  code!: string;

  @IsString()
  @Length(1, PASSWORD_MAX)
  password!: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const t = value.trim().replace(/\s+/g, ' ');
    return t === '' ? undefined : t;
  })
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsIn(LOCALES)
  locale?: 'en' | 'sw';
}

/** Finish a password reset: the code proves the number. */
export class ResetPasswordDto {
  @IsString()
  @MaxLength(32)
  phone!: string;

  @IsString()
  @Length(6, 12)
  code!: string;

  @IsString()
  @Length(1, PASSWORD_MAX)
  newPassword!: string;
}
