import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';

import { Roles } from '@/auth/decorators/Roles';
import { GqlAuthGuard } from '@/auth/guards/gql-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { GetAbcAnalysisStatisticsArgs } from '@/reports/args/get-abc-analysis-statistics.args';
import { GetSalesStatisticsArgs } from '@/reports/args/get-sales-statistics.args';
import { ReportsService } from '@/reports/reports.service';
import { AbcAnalysisResponse } from '@/reports/types/abc-analysis-response.type';
import { SalesReportByCategoryResponse } from '@/reports/types/grouped-by-category.type';
import { SalesReportByDayResponse } from '@/reports/types/grouped-by-day.type';
import { SalesReportByProdResponse } from '@/reports/types/grouped-by-products.type';
import { Role } from '@/users/enums/role.enum';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class ReportsResolver {
  constructor(private readonly reportsService: ReportsService) {}

  @Query(() => SalesReportByProdResponse)
  getSalesByProduct(@Args() args: GetSalesStatisticsArgs): Promise<SalesReportByProdResponse> {
    return this.reportsService.getSalesGroupedByProduct(args);
  }
  @Query(() => SalesReportByCategoryResponse)
  getSalesByCategory(@Args() args: GetSalesStatisticsArgs): Promise<SalesReportByCategoryResponse> {
    return this.reportsService.getSalesGroupedByCategory(args);
  }

  @Query(() => SalesReportByDayResponse)
  getSalesByDay(@Args() args: GetSalesStatisticsArgs): Promise<SalesReportByDayResponse> {
    return this.reportsService.getSalesGroupedByDay(args);
  }

  @Query(() => AbcAnalysisResponse)
  async getAbcAnalysis(@Args() args: GetAbcAnalysisStatisticsArgs): Promise<AbcAnalysisResponse> {
    return this.reportsService.getAbcAnalysis(args);
  }
}
