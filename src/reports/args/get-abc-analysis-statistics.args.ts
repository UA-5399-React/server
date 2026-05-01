import { ArgsType, Field, GraphQLISODateTime, ID, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

import { AbcMetricEnum } from '@/reports/enums/abc-metric.enum';

@ArgsType()
export class GetAbcAnalysisStatisticsArgs {
  @Field(() => AbcMetricEnum, { defaultValue: AbcMetricEnum.REVENUE })
  @IsEnum(AbcMetricEnum)
  metric: AbcMetricEnum;

  @Field(() => GraphQLISODateTime)
  @Type(() => Date)
  @IsDate()
  dateFrom: Date;

  @Field(() => GraphQLISODateTime, { defaultValue: () => new Date() })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  categoryId?: string;

  @Field(() => Int, { nullable: true, defaultValue: 80 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  aThreshold?: number;

  @Field(() => Int, { nullable: true, defaultValue: 95 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  bThreshold?: number;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
