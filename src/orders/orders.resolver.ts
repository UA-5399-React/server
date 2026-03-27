import { NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';

import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/Roles';
import { GqlAuthGuard } from '@/auth/guards/gql-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import type { JwtPayload } from '@/auth/types/jwt-payload.type';
import { OrdersQueryArgs } from '@/orders/graphql/args/orders-query.args';
import { OrderType } from '@/orders/graphql/types/order.type';
import { OrdersPage } from '@/orders/graphql/types/orders-page.type';
import { toOrderType } from '@/orders/orders.mapper';
import { OrdersService } from '@/orders/orders.service';
import { Role } from '@/users/enums/role.enum';

import { UpdateOrderStatusInput } from './graphql/inputs/status-update.inputs';
import { UpdateOrderProductsInput } from './graphql/inputs/update-order-items.input';
import { UpdateOrderShippingAddressInput } from './graphql/inputs/update-order-shipping.input';
import { UpdateOrderUserInput } from './graphql/inputs/update-order-user.input';
import { OrderProductStatsType } from './graphql/types/order-product-stats.type';
import { OrderStatsType } from './graphql/types/order-stats.type';
import { mapOrderToGraphQL } from './graphql/utils/map-order';

@UseGuards(GqlAuthGuard, RolesGuard)
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

  @Query(() => OrderStatsType)
  async orderStats() {
    return this.ordersService.getOrderStats();
  }

  @Query(() => OrderProductStatsType)
  async getProductInOrders(@Args('productId', { type: () => ID }) productId: string) {
    return this.ordersService.findProductsInOrders(productId);
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

  @Mutation(() => OrderType)
  async updateOrderItems(@Args('input') input: UpdateOrderProductsInput): Promise<OrderType> {
    return this.ordersService.updateOrderItems(input);
  }

  @Mutation(() => OrderType)
  async updateOrderUserInfo(@Args('input') input: UpdateOrderUserInput): Promise<OrderType> {
    return this.ordersService.updateOrderUserInfo(input);
  }

  @Mutation(() => OrderType)
  async updateOrderShippingAddress(
    @Args('input') input: UpdateOrderShippingAddressInput,
  ): Promise<OrderType> {
    return this.ordersService.updateOrderShippingAddress(input);
  }
}
