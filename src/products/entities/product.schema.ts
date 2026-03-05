import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument } from 'mongoose';

import { ProductStatus } from '../enums/product-status.enum';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  @Prop()
  imageUrl?: string;

  @ApiProperty({ enum: ProductStatus, default: ProductStatus.DRAFT })
  @Prop({ type: String, enum: ProductStatus, default: ProductStatus.DRAFT })
  status: ProductStatus;

  @ApiProperty({ example: 'iPhone 15 Pro' })
  @Prop({ required: true })
  title: string;

  @ApiProperty({ example: ['electronics', 'smartphone'], required: false })
  @Prop({ type: [String], default: [] })
  tags: string[];

  @ApiProperty({ example: 'Latest Apple smartphone', required: false })
  @Prop()
  description?: string;

  @ApiProperty({ example: 999.99 })
  @Prop({ required: true, default: 0 })
  price: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
