import { Field, ObjectType } from '@nestjs/graphql';

import { BaseSalesSummaryType } from '@/reports/types/base-sales-summary.type';
import { SalesReportItemType } from '@/reports/types/sales-report-item.type';

@ObjectType({ implements: SalesReportItemType })
export class GroupedByCategory extends SalesReportItemType {
  @Field(() => String)
  category: string;
}

@ObjectType()
export class CategorySalesSummaryType extends BaseSalesSummaryType {}

@ObjectType()
export class SalesReportByCategoryResponse {
  @Field(() => [GroupedByCategory])
  items: GroupedByCategory[];

  @Field(() => CategorySalesSummaryType)
  summary: CategorySalesSummaryType;
}
