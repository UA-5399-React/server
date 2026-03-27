import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

import { ShippingCarrier } from '../enums/shipping-carrier.enum';

export class UpdateShippingAddressDto {
  @ApiProperty({ enum: ShippingCarrier })
  @IsEnum(ShippingCarrier)
  carrier: ShippingCarrier;

  @ApiProperty({ example: 'Lviv' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: '7' })
  @IsString()
  @IsNotEmpty()
  branchNumber: string;
}
