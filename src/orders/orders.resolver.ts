import { OrdersService } from '@/orders/orders.service';

export class OrdersResolver {
  constructor(private readonly ordersService: OrdersService) {}
}
