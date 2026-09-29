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

/**
 * Sign up with a phone number and a password (ADR 0021). No code: the
 * number is a username, marked not verified.
 */
export class RegisterDto {
  @IsString()
  @MaxLength(32)
  phone!: string;

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

/** Forgot password without SMS: the recovery key proves the account. */
export class RecoverDto {
  /** The phone number or email the account signs in with. */
  @IsString()
  @Length(1, 254)
  identifier!: string;

  @IsString()
  @Length(1, 64)
  recoveryKey!: string;

  @IsString()
  @Length(1, PASSWORD_MAX)
  newPassword!: string;
}

/** A new recovery key replaces the old one; the password proves it is you. */
export class NewRecoveryKeyDto {
  @IsString()
  @Length(1, PASSWORD_MAX)
  password!: string;
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

/**
 * "Continue with Google" (ADR 0020): what the web server got back from
 * Google, plus the PKCE verifier and nonce it kept in a cookie.
 */
export class GoogleSignInDto {
  @IsString()
  @Length(1, 2048)
  code!: string;

  @IsString()
  @Length(43, 128)
  codeVerifier!: string;

  @IsString()
  @Length(16, 128)
  nonce!: string;

  @IsString()
  @MaxLength(300)
  redirectUri!: string;

  @IsOptional()
  @IsIn(LOCALES)
  locale?: 'en' | 'sw';
}
