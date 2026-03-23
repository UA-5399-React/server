import { ObjectType } from '@nestjs/graphql';

import { PaginatedResponse } from '@/graphql/types/paginated-response';
import { OrderType } from '@/orders/graphql/types/order.type';

@ObjectType()
export class OrdersPage extends PaginatedResponse(OrderType) {}
