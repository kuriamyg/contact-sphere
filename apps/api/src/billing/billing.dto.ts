import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Pay for Plus with the M-Pesa prompt: 1 or 12 months. */
export class MpesaPayDto {
  @IsIn([1, 12])
  months!: number;

  @IsString()
  @MaxLength(32)
  phone!: string;
}

/** Operator: free months for a pilot or a friend. */
export class GrantDto {
  @IsInt()
  @Min(1)
  @Max(24)
  months!: number;
}

/** Operator: an M-Pesa payment sent by hand, recorded by its code. */
export class RecordPaymentDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[A-Z0-9]{10}$/, {
    message: 'An M-Pesa code has 10 letters and digits, like SJK3ABCD12.',
  })
  receipt!: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  amountKes!: number;

  @IsInt()
  @Min(1)
  @Max(24)
  months!: number;
}
