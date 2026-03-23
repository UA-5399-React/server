import { Args, ID, Query, Resolver } from '@nestjs/graphql';

import { OrdersQueryArgs } from '@/orders/graphql/args/orders-query.args';
import { OrderType } from '@/orders/graphql/types/order.type';
import { OrdersPage } from '@/orders/graphql/types/orders-page.type';
import { toOrderType } from '@/orders/orders.mapper';
import { OrdersService } from '@/orders/orders.service';

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
}
