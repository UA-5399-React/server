import { OrderDocument, OrderItem } from '@/orders/entities';
import { OrderType } from '@/orders/graphql/types/order.type';

const mapItem = ({ product, ...rest }: OrderItem) => ({
  product: product.toString(),
  ...rest,
});

export function toOrderType(order: OrderDocument): OrderType {
  const { _id, userId, items, ...rest } = order;

  return {
    ...rest,
    id: _id.toString(),
    userId: userId.toString(),
    items: items.map(mapItem),
  };
}
