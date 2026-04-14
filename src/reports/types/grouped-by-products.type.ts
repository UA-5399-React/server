import { Field, ObjectType } from '@nestjs/graphql';

import { SalesReportItemType } from '@/reports/types/sales-report-item.type';

@ObjectType({ implements: SalesReportItemType })
export class GroupedByProduct extends SalesReportItemType {
  @Field(() => String)
  productName: string;
}
