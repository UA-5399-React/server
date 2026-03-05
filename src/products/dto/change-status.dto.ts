import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { ProductStatus } from '../enums/product-status.enum';

export class ChangeStatusDto {
  @ApiProperty({
    enum: ProductStatus,
    description: 'New product status',
    example: ProductStatus.ACTIVE,
  })
  @IsEnum(ProductStatus)
  status: ProductStatus;
}
