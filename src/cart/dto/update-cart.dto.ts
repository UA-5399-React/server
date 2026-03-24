import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsMongoId, IsNotEmpty, Min, ValidateNested } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({ example: '665f1b2c3e4a5b6c7d8e9f00', description: 'Product ID' })
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 2, description: 'Quantity of the product', minimum: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity: number;
}

export class UpdateCartDto {
  @ApiProperty({ type: [UpdateCartItemDto], description: 'List of items to be in the cart' })
  @ValidateNested({ each: true })
  @Type(() => UpdateCartItemDto)
  @IsNotEmpty()
  items: UpdateCartItemDto[];
}
