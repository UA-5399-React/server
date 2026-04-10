import { ApiProperty } from '@nestjs/swagger';

export class OrderStatusSegmentDto {
  @ApiProperty() status!: string;
  @ApiProperty() count!: number;
  @ApiProperty() percentage!: number;
}

export class OrdersStatusStatsDto {
  @ApiProperty() total!: number;
  @ApiProperty({ type: OrderStatusSegmentDto }) largestSegment!: OrderStatusSegmentDto;
  @ApiProperty({ type: [OrderStatusSegmentDto] }) statuses!: OrderStatusSegmentDto[];
}
