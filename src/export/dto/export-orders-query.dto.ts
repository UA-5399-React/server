import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ExportOrdersQueryDto {
  @ApiPropertyOptional({ description: 'Filter by order status', example: 'new' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Search by orderId or customer email',
    example: 'ORD-20240318-0042',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
