import { OrderType } from '../types/order.type';

export function mapOrderToGraphQL(order: any): OrderType {
  return {
    ...order,
    id: order._id.toString(),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
