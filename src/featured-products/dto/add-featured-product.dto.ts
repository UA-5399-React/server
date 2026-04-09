import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNumber, IsOptional, Min } from 'class-validator';

import { FeaturedProductType } from '../enums/featured-product-type.enum';

export class AddFeaturedProductDto {
  @ApiProperty({ example: '661f3a9d6f1c2e0012345678' })
  @IsMongoId()
  productId: string;

  @ApiProperty({ enum: FeaturedProductType, example: FeaturedProductType.NEW_ARRIVAL })
  @IsEnum(FeaturedProductType)
  type: FeaturedProductType;

  @ApiPropertyOptional({ example: 1, description: 'Display position (lower = first)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number;
}
