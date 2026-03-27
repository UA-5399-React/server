import { OrderStatus } from './enums/order-status.enum';

export const NON_CANCELLABLE_STATUSES: OrderStatus[] = [
  OrderStatus.SHIPPING,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
];

export const NON_EDITABLE_ADDRESS_STATUSES: OrderStatus[] = [
  OrderStatus.SHIPPING,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
];
