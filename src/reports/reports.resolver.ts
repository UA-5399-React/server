import { Args, Query, Resolver } from '@nestjs/graphql';

import { GetAbcAnalysisStatisticsArgs } from '@/reports/args/get-abc-analysis-statistics.args';
import { GetSalesStatisticsArgs } from '@/reports/args/get-sales-statistics.args';
import { ReportsService } from '@/reports/reports.service';
import { AbcAnalysisResponse } from '@/reports/types/abc-analysis-response.type';
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

  @Query(() => AbcAnalysisResponse)
  async getAbcAnalysis(@Args() args: GetAbcAnalysisStatisticsArgs): Promise<AbcAnalysisResponse> {
    return this.reportsService.getAbcAnalysis(args);
  }
}
