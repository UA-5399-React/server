import { ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Types } from 'mongoose';

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

import { CreateOrderInput } from './graphql/inputs/create-order.input';
import { UpdateOrderStatusInput } from './graphql/inputs/status-update.inputs';
import { UpdateOrderProductsInput } from './graphql/inputs/update-order-items.input';
import { UpdateOrderShippingAddressInput } from './graphql/inputs/update-order-shipping.input';
import { UpdateOrderUserInput } from './graphql/inputs/update-order-user.input';
import { OrderStatsType } from './graphql/types/order-stats.type';
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

  @Query(() => OrderStatsType)
  async orderStats() {
    return this.ordersService.getOrderStats();
  }

  @Mutation(() => OrderType)
  async createOrder(
    @Args('input') input: CreateOrderInput,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrderType> {
    const order = await this.ordersService.create(input, new Types.ObjectId(user.sub));

    const plain = (order as any).toObject();

    return {
      ...plain,
      id: plain._id.toString(),
      userId: plain.userId.toString(),
    } as unknown as OrderType;
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

  @Mutation(() => Boolean)
  async deleteOrder(@Args('orderId') orderId: string, @CurrentUser() user: JwtPayload) {
    if (user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Not allowed');
    }
    await this.ordersService.remove(orderId);
    return true;
  }
}
