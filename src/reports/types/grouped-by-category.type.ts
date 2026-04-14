import { Field, ObjectType } from '@nestjs/graphql';

import { SalesReportItemType } from '@/reports/types/sales-report-item.type';

@ObjectType({ implements: SalesReportItemType })
export class GroupedByCategory extends SalesReportItemType {
  @Field(() => String)
  category: string;
}
