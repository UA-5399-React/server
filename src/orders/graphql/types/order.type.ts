import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

import { OrderStatus } from '@/orders/enums';
import { OrderItemType } from '@/orders/graphql/types/order-item.type';
import { OrderUserType } from '@/orders/graphql/types/order-user.type';
import { PaymentInfoType } from '@/orders/graphql/types/payment-info.type';
import { ShippingAddressType } from '@/orders/graphql/types/shipping-address.type';

@ObjectType()
export class OrderType {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  orderId!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => [OrderItemType])
  items!: OrderItemType[];

  @Field(() => Number)
  amount!: number;

  @Field(() => Number)
  totalPrice!: number;

  @Field(() => ShippingAddressType)
  shippingAddress!: ShippingAddressType;

  @Field(() => OrderStatus)
  status!: OrderStatus;

  @Field(() => OrderUserType)
  user!: OrderUserType;

  @Field(() => PaymentInfoType)
  payment!: PaymentInfoType;

  @Field({ nullable: true })
  message?: string;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}
