import { ArgsType, Field, GraphQLISODateTime, ID } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional } from 'class-validator';

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
}
