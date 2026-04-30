import { Field, Int, ObjectType } from '@nestjs/graphql';

import { BaseSalesSummaryType } from '@/reports/types/base-sales-summary.type';
import { SalesReportItemType } from '@/reports/types/sales-report-item.type';

@ObjectType({ implements: SalesReportItemType })
export class GroupedByProduct extends SalesReportItemType {
  @Field(() => String)
  productName: string;

  @Field(() => String, { nullable: true })
  productCode?: string | null;
}

@ObjectType()
export class ProductSalesSummaryType extends BaseSalesSummaryType {}

@ObjectType()
export class SalesReportByProdResponse {
  @Field(() => [GroupedByProduct])
  items: GroupedByProduct[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => ProductSalesSummaryType)
  summary: ProductSalesSummaryType;
}
