import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

import { ProductStatus } from '../enums/product-status.enum';
import { ProductImageDto } from './product-image.dto';

export class ProductListItemDto {
  @ApiProperty({ example: '661f3a9d6f1c2e0012345678' })
  _id!: string;

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  imageUrl?: string;

  @ApiProperty({ example: 'products/sample-image', required: false })
  imagePublicId?: string;

  @ApiProperty({ type: [ProductImageDto], required: false })
  additionalImages?: ProductImageDto[];

  @ApiProperty({ enum: ProductStatus, example: ProductStatus.ACTIVE })
  status!: ProductStatus;

  @ApiProperty({ example: 'iPhone 15 Pro' })
  title!: string;

  @ApiProperty({ example: ['661f3a9d6f1c2e0012341111'] })
  categories!: Types.ObjectId[];

  @ApiProperty({ example: 'Latest Apple smartphone', required: false })
  description?: string;

  @ApiProperty({ example: 999.99 })
  price!: number;

  @ApiProperty({ example: '0000001' })
  productCode!: string;

  @ApiProperty({ example: '2026-04-07T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-07T12:00:00.000Z' })
  updatedAt!: Date;

  @ApiProperty({ example: 12 })
  purchaseCount!: number;
}
