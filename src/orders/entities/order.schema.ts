import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HydratedDocument, Types } from 'mongoose';

import { OrderStatus } from '../enums';
import { OrderItem, OrderItemSchema } from './order-item.schema';
import { OrderUser, OrderUserSchema } from './order-user.schema';
import { PaymentInfo, PaymentInfoSchema } from './payment-info.schema';
import { ShippingAddress, ShippingAddressSchema } from './shipping-address.schema';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
  @ApiProperty({ description: 'Human-readable order identifier', example: 'ORD-20240318-0042' })
  @Prop({ required: true, unique: true, index: true })
  orderId: string;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @ApiProperty({ type: [OrderItem] })
  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @ApiProperty({
    example: 1999.98,
    description: 'Sum of (unitPrice × amount) for all items — no discounts applied',
  })
  @Prop({ required: true })
  amount: number;

  @ApiProperty({
    example: 1999.98,
    description:
      'Final price after discounts, coupons, etc. Equal to `amount` until discounts are implemented',
  })
  @Prop({ required: true })
  totalPrice: number;

  @ApiProperty({ type: ShippingAddress })
  @Prop({ type: ShippingAddressSchema, required: true })
  shippingAddress: ShippingAddress;

  @ApiProperty({ enum: OrderStatus, default: OrderStatus.NEW })
  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.NEW, index: true })
  status: OrderStatus;

  @ApiProperty({ type: OrderUser })
  @Prop({ type: OrderUserSchema, required: true })
  user: OrderUser;

  @ApiProperty({ type: PaymentInfo })
  @Prop({ type: PaymentInfoSchema, required: true })
  payment: PaymentInfo;

  @ApiPropertyOptional({ example: 'Please leave at the door.' })
  @Prop()
  message?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
