import { Args, Query, Resolver } from '@nestjs/graphql';

import { GetSalesStatisticsArgs } from '@/reports/inputs/get-sales-statistics.args';
import { ReportsService } from '@/reports/reports.service';
import { GroupedByCategory } from '@/reports/types/grouped-by-category.type';
import { GroupedByDay } from '@/reports/types/grouped-by-day.type';
import { GroupedByProduct } from '@/reports/types/grouped-by-products.type';

@Resolver()
export class ReportsResolver {
  constructor(private readonly reportsService: ReportsService) {}

  @Query(() => [GroupedByProduct])
  getSalesByProduct(@Args() args: GetSalesStatisticsArgs): Promise<GroupedByProduct[]> {
    return this.reportsService.getSalesGroupedByProduct(args);
  }
  @Query(() => [GroupedByCategory])
  getSalesByCategory(@Args() args: GetSalesStatisticsArgs): Promise<GroupedByCategory[]> {
    return this.reportsService.getSalesGroupedByCategory(args);
  }

  @Query(() => [GroupedByDay])
  getSalesByDay(@Args() args: GetSalesStatisticsArgs): Promise<GroupedByDay[]> {
    return this.reportsService.getSalesGroupedByDay(args);
  }
}
