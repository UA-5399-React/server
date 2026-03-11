import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { HydratedDocument, Types } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true })
export class Category {
  @ApiPropertyOptional({ example: 'Smartphone' })
  @Prop({ required: true })
  title!: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @Prop()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'Category of different smartphones' })
  @Prop()
  description?: string;

  @ApiPropertyOptional()
  @Prop({ type: Types.ObjectId, ref: 'Category', default: null })
  parent?: Types.ObjectId | null;

  @ApiPropertyOptional({ example: 1 })
  @Prop({ required: true, enum: [1, 2] })
  depth!: number;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
