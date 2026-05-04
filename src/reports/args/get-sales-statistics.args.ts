import { ArgsType, Field, GraphQLISODateTime, ID, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

import { GroupByEnum } from '@/reports/enums/groupby.enum';

@ArgsType()
export class GetSalesStatisticsArgs {
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

  @Field(() => GroupByEnum, { defaultValue: GroupByEnum.PRODUCT })
  @IsOptional()
  @IsEnum(GroupByEnum)
  groupBy?: GroupByEnum;

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
