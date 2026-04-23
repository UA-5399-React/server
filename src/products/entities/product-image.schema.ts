import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ _id: false })
export class ProductImage {
  @ApiProperty({ example: 'https://example.com/image.jpg' })
  @Prop({ required: true })
  imageUrl!: string;

  @ApiProperty({ example: 'products/sample-image' })
  @Prop({ required: true })
  imagePublicId!: string;
}

export const ProductImageSchema = SchemaFactory.createForClass(ProductImage);
