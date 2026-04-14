import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, Types } from 'mongoose';

import { FeaturedProductType } from '../enums/featured-product-type.enum';

export type FeaturedProductDocument = HydratedDocument<FeaturedProduct>;

@Schema({ timestamps: true })
export class FeaturedProduct {
  @ApiProperty({ description: 'Reference to the Product document' })
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @ApiProperty({ enum: FeaturedProductType, example: FeaturedProductType.NEW_ARRIVAL })
  @Prop({ type: String, enum: FeaturedProductType, required: true })
  type: FeaturedProductType;

  @ApiProperty({ example: 1, description: 'Display order position (lower = first)' })
  @Prop({ default: 0 })
  position: number;
}

export const FeaturedProductSchema = SchemaFactory.createForClass(FeaturedProduct);

FeaturedProductSchema.index({ productId: 1, type: 1 }, { unique: true });
