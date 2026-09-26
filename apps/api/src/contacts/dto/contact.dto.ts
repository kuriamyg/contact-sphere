import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsUUID,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { MAX_TAG_LENGTH, MAX_TAGS } from '../contact-names';

/** Per contact. Generous for real address books, bounded for abuse. */
export const MAX_PHONES = 20;
export const MAX_EMAILS = 20;

/** Trims text; blank becomes undefined, so "" never overwrites with junk. */
const trimmed = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const t = value.trim();
  return t === '' ? undefined : t;
};

const lowerTrimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class PhoneInputDto {
  @Transform(trimmed)
  @IsString()
  @Length(1, 64)
  raw!: string;

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(40)
  label?: string;
}

export class EmailInputDto {
  @Transform(lowerTrimmed)
  @IsEmail()
  @MaxLength(254)
  address!: string;

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(40)
  label?: string;
}

/**
 * A whole contact, as created or saved from the edit form. Saving replaces
 * the phone and email lists; their order is kept, and the first of each is
 * the primary one.
 */
export class ContactInputDto {
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(200)
  displayName?: string;

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(100)
  givenName?: string;

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(100)
  familyName?: string;

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(100)
  nickname?: string;

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(200)
  organization?: string;

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(200)
  jobTitle?: string;

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(10_000)
  notes?: string;

  /** A calendar date, "YYYY-MM-DD". */
  @IsOptional()
  @Transform(trimmed)
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    message: 'birthday must be a date as YYYY-MM-DD',
  })
  birthday?: string;

  /** Estate, town or stage: "Kasarani". */
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(100)
  area?: string;

  /** How the owner knows them: "church", "Wanjiru's wedding". */
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(200)
  metThrough?: string;

  /** What they do or offer. Normalised (lower-case, no repeats) on save. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_TAGS)
  @IsString({ each: true })
  @MaxLength(MAX_TAG_LENGTH, { each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_PHONES)
  @ValidateNested({ each: true })
  @Type(() => PhoneInputDto)
  phones?: PhoneInputDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_EMAILS)
  @ValidateNested({ each: true })
  @Type(() => EmailInputDto)
  emails?: EmailInputDto[];
}

export const SORTS = ['name', 'created', 'lastUsed'] as const;
export const ORDERS = ['asc', 'desc'] as const;
export const VIEWS = ['active', 'archived', 'trash'] as const;
export type Sort = (typeof SORTS)[number];
export type Order = (typeof ORDERS)[number];
export type View = (typeof VIEWS)[number];

export class ListContactsQueryDto {
  /**
   * Every word must match somewhere: names, organisation, job, area,
   * met-through, tags, notes or emails (partial, case- and
   * accent-insensitive). A number matches phone digits.
   */
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(SORTS)
  sort?: Sort;

  /** Default: A–Z for names, newest first for dates. */
  @IsOptional()
  @IsIn(ORDERS)
  order?: Order;

  @IsOptional()
  @IsIn(VIEWS)
  view?: View;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  /** Only contacts with exactly this tag. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @Length(1, MAX_TAG_LENGTH)
  tag?: string;
}

/** Largest .vcf text accepted (photos are removed before upload). */
export const MAX_VCF_CHARS = 4_000_000;

export class ImportVcfDto {
  @IsString()
  @Length(1, MAX_VCF_CHARS)
  vcf!: string;
}

export class ContactPairDto {
  @IsUUID()
  keepId!: string;

  @IsUUID()
  mergeId!: string;
}

export class MergeChoicesDto {
  @IsOptional() @IsIn(['keep', 'merge']) displayName?: 'keep' | 'merge';
  @IsOptional() @IsIn(['keep', 'merge']) givenName?: 'keep' | 'merge';
  @IsOptional() @IsIn(['keep', 'merge']) familyName?: 'keep' | 'merge';
  @IsOptional() @IsIn(['keep', 'merge']) nickname?: 'keep' | 'merge';
  @IsOptional() @IsIn(['keep', 'merge']) organization?: 'keep' | 'merge';
  @IsOptional() @IsIn(['keep', 'merge']) jobTitle?: 'keep' | 'merge';
  @IsOptional() @IsIn(['keep', 'merge']) birthday?: 'keep' | 'merge';
}

export class MergeDto extends ContactPairDto {
  /** Per conflicting field: keep the kept contact's value, or take the other. */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => MergeChoicesDto)
  choices?: MergeChoicesDto;
}

export class RenameTagDto {
  @IsString()
  @Length(1, MAX_TAG_LENGTH)
  from!: string;

  @Transform(trimmed)
  @IsString()
  @Length(1, MAX_TAG_LENGTH)
  to!: string;
}

export class TagDto {
  @IsString()
  @Length(1, MAX_TAG_LENGTH)
  tag!: string;
}

export class SavedSearchDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString()
  @Length(1, 60)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  query?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_TAG_LENGTH)
  tag?: string;
}
