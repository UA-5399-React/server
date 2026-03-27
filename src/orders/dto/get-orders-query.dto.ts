import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { OrderStatus } from '../enums/order-status.enum';

export class GetOrdersQueryDto {
  @ApiPropertyOptional({
    enum: OrderStatus,
    example: OrderStatus.NEW,
    description: 'Filter orders by status',
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    example: 'john@example.com',
    description: 'Search by orderId or customer email',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
