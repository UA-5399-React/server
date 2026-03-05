import { Field, Float, GraphQLISODateTime, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument } from 'mongoose';

import { ProductStatus } from '../enums/product-status.enum';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
@ObjectType({ description: 'product' })
export class Product {
  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  @Prop()
  @Field({ nullable: true })
  imageUrl?: string;

  @ApiProperty({ enum: ProductStatus, default: ProductStatus.DRAFT })
  @Prop({ type: String, enum: ProductStatus, default: ProductStatus.DRAFT })
  @Field(() => ProductStatus)
  status: ProductStatus;

  @ApiProperty({ example: 'iPhone 15 Pro' })
  @Prop({ required: true })
  @Field()
  title: string;

  @ApiProperty({ example: ['electronics', 'smartphone'], required: false })
  @Prop({ type: [String], default: [] })
  @Field(() => [String])
  tags: string[];

  @ApiProperty({ example: 'Latest Apple smartphone', required: false })
  @Prop()
  @Field({ nullable: true })
  description?: string;

  @ApiProperty({ example: 999.99 })
  @Prop({ required: true, default: 0 })
  @Field(() => Float)
  price: number;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
