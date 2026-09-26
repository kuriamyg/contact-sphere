import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

export const GROUP_KINDS = [
  'chama',
  'church',
  'family',
  'work',
  'estate',
  'school',
  'other',
] as const;
export type GroupKind = (typeof GROUP_KINDS)[number];

/** Members added in one request; a group holds at most MAX_MEMBERS. */
export const MAX_ADD = 500;
export const MAX_MEMBERS = 2000;

const tidy = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const t = value.trim().replace(/\s+/g, ' ');
  return t === '' ? undefined : t;
};

export class GroupInputDto {
  @Transform(tidy)
  @IsString()
  @Length(1, 80)
  name!: string;

  @IsOptional()
  @IsIn(GROUP_KINDS)
  kind?: GroupKind;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class AddMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_ADD)
  @IsUUID('all', { each: true })
  contactIds!: string[];

  @IsOptional()
  @Transform(tidy)
  @IsString()
  @MaxLength(40)
  role?: string;
}

export class RoleDto {
  /** Blank or absent clears the role. */
  @IsOptional()
  @Transform(tidy)
  @IsString()
  @MaxLength(40)
  role?: string;
}
