import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class CartProductDto {
  @ApiProperty({ example: '665f1b2c3e4a5b6c7d8e9f00' })
  _id: string;

  @ApiProperty({ example: 'iPhone 15 Pro' })
  title: string;

  @ApiProperty({ example: 999.99 })
  price: number;

  @ApiProperty({ example: 'https://example.com/image.jpg' })
  imageUrl?: string;

  @ApiProperty({ example: 'PROD-001' })
  productCode: string;
}

class CartItemDto {
  @ApiProperty({ type: CartProductDto })
  @Type(() => CartProductDto)
  product: CartProductDto;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 1999.98 })
  subtotal: number;
}

export class CartResponseDto {
  @ApiProperty({ example: '665f1b2c3e4a5b6c7d8e9f00' })
  userId: string;

  @ApiProperty({ type: [CartItemDto] })
  @Type(() => CartItemDto)
  items: CartItemDto[];

  @ApiProperty({ example: 1999.98 })
  total: number;
}
