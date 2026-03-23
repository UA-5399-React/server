import { NotFoundException, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { Roles } from '@/auth/decorators/Roles';
import { GqlAuthGuard } from '@/auth/guards/gql-auth.guard';
import { OrdersService } from '@/orders/orders.service';
import { Role } from '@/users/enums/role.enum';

import { UpdateOrderStatusInput } from './graphql/inputs/status-update.inputs';
import { OrderType } from './graphql/types/order.type';
import { mapOrderToGraphQL } from './graphql/utils/map-order';

@UseGuards(GqlAuthGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Resolver(() => OrderType)
export class OrdersResolver {
  constructor(private readonly ordersService: OrdersService) {}

  @Query(() => OrderType)
  async getOrder(@Args('orderId') orderId: string): Promise<OrderType> {
    const order = await this.ordersService.findOrderById(orderId);

    if (!order) throw new NotFoundException('Order not found');

    return mapOrderToGraphQL(order);
  }

  @Mutation(() => OrderType)
  async updateOrderStatus(@Args('input') input: UpdateOrderStatusInput): Promise<OrderType> {
    console.log('Mutation input:', input);
    console.log('args keys:', Object.keys(input)); // Should print ["orderId", "status"]
    const order = await this.ordersService.updateOrderStatus(input.orderId, input.status);

    return mapOrderToGraphQL(order);
  }
}
