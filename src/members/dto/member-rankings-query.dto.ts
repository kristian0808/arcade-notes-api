import { IsEnum, IsOptional } from 'class-validator';

export enum TimeframeEnum {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  ALL = 'all'
}

export class MemberRankingsQueryDto {
  @IsOptional()
  @IsEnum(TimeframeEnum)
  timeframe?: TimeframeEnum = TimeframeEnum.MONTH;
}
