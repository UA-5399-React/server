import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';

import { Roles } from '@/auth/decorators/Roles';
import { GqlAuthGuard } from '@/auth/guards/gql-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Role } from '@/users/enums/role.enum';

import { SalesDynamicsArgs } from './args/sales-dynamics.args';
import { StatisticsService } from './statistics.service';
import { SalesDynamicsPoint } from './types/sales-dynamics-point.type';

@UseGuards(GqlAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Resolver()
export class StatisticsResolver {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Query(() => [SalesDynamicsPoint], {
    name: 'salesDynamics',
    description:
      'Time-series sales data for 1–2 products. Returns an array of {date, productId, value} ' +
      'points grouped by the requested granularity. Zero-filled so every bucket is present.',
  })
  getSalesDynamics(@Args() args: SalesDynamicsArgs): Promise<SalesDynamicsPoint[]> {
    return this.statisticsService.getSalesDynamics(args);
  }
}
