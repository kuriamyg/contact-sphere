import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';

import { type AuthContext, CurrentAuth } from '../auth/decorators';
import { AddRelationshipDto, DismissSuggestionDto } from './relationships.dto';
import {
  type RelationshipMap,
  type RelationshipView,
  RelationshipsService,
  type Suggestion,
} from './relationships.service';

const Id = () => new ParseUUIDPipe();

/** Links between the owner's contacts (P6). Session required; owner-scoped. */
@Controller('relationships')
export class RelationshipsController {
  constructor(private readonly rel: RelationshipsService) {}

  /** Plus only (403 otherwise). `focus` must be one of the owner's contacts. */
  @Get('map')
  map(
    @CurrentAuth() a: AuthContext,
    @Query('focus', new ParseUUIDPipe({ optional: true })) focus?: string,
  ): Promise<RelationshipMap> {
    return this.rel.map(a.userId, focus);
  }

  @Get('suggestions')
  suggestions(@CurrentAuth() a: AuthContext): Promise<Suggestion[]> {
    return this.rel.suggestions(a.userId);
  }

  @Post('suggestions/dismiss')
  @HttpCode(HttpStatus.NO_CONTENT)
  dismiss(
    @CurrentAuth() a: AuthContext,
    @Body() dto: DismissSuggestionDto,
  ): Promise<void> {
    return this.rel.dismiss(a.userId, dto);
  }

  @Get('for-contact/:contactId')
  forContact(
    @CurrentAuth() a: AuthContext,
    @Param('contactId', Id()) contactId: string,
  ): Promise<RelationshipView[]> {
    return this.rel.forContact(a.userId, contactId);
  }

  @Post('for-contact/:contactId')
  add(
    @CurrentAuth() a: AuthContext,
    @Param('contactId', Id()) contactId: string,
    @Body() dto: AddRelationshipDto,
  ): Promise<RelationshipView> {
    return this.rel.add(a.userId, contactId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentAuth() a: AuthContext,
    @Param('id', Id()) id: string,
  ): Promise<void> {
    return this.rel.remove(a.userId, id);
  }
}
