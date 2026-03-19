import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsString, Min, ValidateNested } from 'class-validator';

export class CheckoutItemDto {
  @ApiProperty({ example: '665f1b2c3e4a5b6c7d8e9f00', description: 'Product ID' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 'iPhone 15 Pro' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 999.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 'https://res.cloudinary.com/example/image.jpg', required: false })
  @IsString()
  imageUrl?: string;
}

export class CreateCheckoutSessionDto {
  @ApiProperty({ type: [CheckoutItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];
}
