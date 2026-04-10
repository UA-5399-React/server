import { OrderType } from '../types/order.type';

export function mapOrderToGraphQL(order: any): OrderType {
  const plain = typeof order?.toObject === 'function' ? order.toObject() : order;

  return {
    ...plain,
    id: plain._id.toString(),
    userId: plain.userId?.toString?.() ?? plain.userId,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}
