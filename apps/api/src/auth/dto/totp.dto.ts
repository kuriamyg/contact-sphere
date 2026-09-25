import { IsString, Length, Matches } from 'class-validator';

import { PASSWORD_MAX } from '../auth.constants';

/** A 6-digit TOTP code or a recovery code like K7QM-2XPA-9TRD. */
const CODE = /^[0-9A-Za-z -]{6,20}$/;

export class MfaLoginDto {
  @IsString()
  @Length(43, 43)
  challenge!: string;

  @IsString()
  @Matches(CODE)
  code!: string;
}

export class TotpCodeDto {
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

export class TotpDisableDto {
  @IsString()
  @Length(1, PASSWORD_MAX)
  password!: string;

  @IsString()
  @Matches(CODE)
  code!: string;
}
