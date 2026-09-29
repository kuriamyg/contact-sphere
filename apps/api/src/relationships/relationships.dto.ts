import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { type Role, ROLE_NAMES } from './kinds';

const tidy = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const t = value.trim().replace(/\s+/g, ' ');
  return t === '' ? undefined : t;
};

/** "otherId is this contact's <role>", e.g. parent, sibling, introducedBy. */
export class AddRelationshipDto {
  @IsUUID()
  otherId!: string;

  @IsIn(ROLE_NAMES)
  role!: Role;

  /** The owner's own words ("aunt", "best man"). */
  @IsOptional()
  @Transform(tidy)
  @IsString()
  @MaxLength(40)
  label?: string;
}

export class DismissSuggestionDto {
  @IsIn(['relative', 'introduced'])
  kind!: 'relative' | 'introduced';

  @IsUUID()
  aId!: string;

  @IsUUID()
  bId!: string;
}
