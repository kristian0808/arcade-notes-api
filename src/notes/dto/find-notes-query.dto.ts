// src/notes/dto/find-notes-query.dto.ts

import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum NoteStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  ALL = 'all',
}

export class FindNotesQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  memberId?: number;

  @IsOptional()
  @IsString()
  memberAccount?: string;

  @IsOptional()
  @IsString()
  pcName?: string;

  @IsOptional()
  @IsEnum(NoteStatus)
  @Transform(({ value }) => value || NoteStatus.ALL)
  status?: NoteStatus = NoteStatus.ALL;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Transform(({ value }) => value || 1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Transform(({ value }) => value || 10)
  limit?: number = 10;
}