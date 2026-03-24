import { NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';

import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/Roles';
import { GqlAuthGuard } from '@/auth/guards/gql-auth.guard';
import type { JwtPayload } from '@/auth/types/jwt-payload.type';
import { OrdersQueryArgs } from '@/orders/graphql/args/orders-query.args';
import { OrderType } from '@/orders/graphql/types/order.type';
import { OrdersPage } from '@/orders/graphql/types/orders-page.type';
import { toOrderType } from '@/orders/orders.mapper';
import { OrdersService } from '@/orders/orders.service';
import { Role } from '@/users/enums/role.enum';

import { UpdateOrderStatusInput } from './graphql/inputs/status-update.inputs';
import { mapOrderToGraphQL } from './graphql/utils/map-order';

@UseGuards(GqlAuthGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Resolver(() => OrderType)
export class OrdersResolver {
  constructor(private readonly ordersService: OrdersService) {}

  @Query(() => OrdersPage)
  async orders(@Args() args: OrdersQueryArgs): Promise<OrdersPage> {
    const result = await this.ordersService.findAllOrders(args);

    return {
      ...result,
      items: result.items.map((order) => toOrderType(order)),
    };
  }

  @Query(() => OrderType)
  async order(@Args('id', { type: () => ID }) id: string) {
    const order = await this.ordersService.findById(id);
    return toOrderType(order);
  }

  @Query(() => OrderType)
  async getOrder(@Args('orderId') orderId: string): Promise<OrderType> {
    const order = await this.ordersService.findOrderById(orderId);

    if (!order) throw new NotFoundException('Order not found');

    return mapOrderToGraphQL(order);
  }

  @Mutation(() => OrderType)
  async updateOrderStatus(
    @Args('input') input: UpdateOrderStatusInput,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrderType> {
    const order = await this.ordersService.updateOrderStatus(
      input.orderId,
      input.status,
      user.role,
    );

    return mapOrderToGraphQL(order);
  }
}
