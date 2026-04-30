import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

import { BaseSalesSummaryType } from '@/reports/types/base-sales-summary.type';
import { SalesReportItemType } from '@/reports/types/sales-report-item.type';

@ObjectType({ implements: SalesReportItemType })
export class GroupedByDay extends SalesReportItemType {
  @Field(() => String)
  date: string;

  @Field(() => Int)
  ordersCount: number;

  @Field(() => Float)
  averageCheck: number;
}

@ObjectType()
export class DaySalesSummaryType extends BaseSalesSummaryType {
  @Field(() => Int)
  totalOrdersCount: number;

  @Field(() => Float)
  averageCheck: number;
}

@ObjectType()
export class SalesReportByDayResponse {
  @Field(() => [GroupedByDay])
  items: GroupedByDay[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => DaySalesSummaryType)
  summary: DaySalesSummaryType;
}
