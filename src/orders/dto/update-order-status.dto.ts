import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { OrderStatus } from '../enums';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: 'processed' })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
