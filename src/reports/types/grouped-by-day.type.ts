import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

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
