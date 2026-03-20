import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Types } from 'mongoose';

// We intentionally snapshot title, imageUrl and unitPrice at the time of
// ordering. Product details can change later; the customer always sees what
// they actually bought at the price they paid.

@Schema({ _id: false })
export class OrderItem {
  @ApiProperty({ description: 'Reference to the Product document' })
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @ApiProperty({ example: 'iPhone 15 Pro' })
  @Prop({ required: true })
  title: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @Prop()
  imageUrl?: string;

  @ApiProperty({ example: 999.99, description: 'Unit price at the time of order' })
  @Prop({ required: true })
  unitPrice: number;

  @ApiProperty({ example: 2 })
  @Prop({ required: true, min: 1 })
  amount: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);
