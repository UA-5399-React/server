import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import { PaymentMethod } from '../enums/payment-method.enum';
import { ShippingCarrier } from '../enums/shipping-carrier.enum';

// ─── Nested DTOs ─────────────────────────────────────────────────────────────

export class CreateOrderItemDto {
  @ApiProperty({ example: '665f1b2c3e4a5b6c7d8e9f00' })
  @IsMongoId()
  product: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  amount: number;
}

export class CreateShippingAddressDto {
  @ApiProperty({ enum: ShippingCarrier })
  @IsEnum(ShippingCarrier)
  carrier: ShippingCarrier;

  @ApiProperty({ example: 'Kyiv' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: '42' })
  @IsString()
  @IsNotEmpty()
  branchNumber: string;
}

export class CreateOrderUserDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+380501234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

// ─── Root DTO ─────────────────────────────────────────────────────────────────

export class CreateOrderDto {
  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty({ type: CreateShippingAddressDto })
  @ValidateNested()
  @Type(() => CreateShippingAddressDto)
  shippingAddress: CreateShippingAddressDto;

  @ApiProperty({ type: CreateOrderUserDto })
  @ValidateNested()
  @Type(() => CreateOrderUserDto)
  user: CreateOrderUserDto;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: 'Please leave at the door.' })
  @IsOptional()
  @IsString()
  message?: string;
}
