import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateShippingAddressDto } from './dto/update-shipping-address.dto';
import { Order } from './entities/order.schema';
import { OrdersService } from './orders.service';

// TODO: remove static userId and restore auth once login is working
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
const DEV_USER_ID = new Types.ObjectId('000000000000000000000001');

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Place a new order' })
  @ApiResponse({ status: 201, type: Order })
  @ApiResponse({ status: 400, description: 'One or more products are unavailable.' })
  create(@Body() dto: CreateOrderDto): Promise<Order> {
    // TODO: replace DEV_USER_ID with @CurrentUser('_id') userId: Types.ObjectId
    return this.ordersService.create(dto, DEV_USER_ID);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get all orders belonging to the current user' })
  @ApiResponse({ status: 200, type: [Order] })
  findMyOrders(): Promise<Order[]> {
    // TODO: replace DEV_USER_ID with @CurrentUser('_id') userId: Types.ObjectId
    return this.ordersService.findMyOrders(DEV_USER_ID);
  }

  @Get('my/:orderId')
  @ApiOperation({ summary: 'Get a single order by orderId (must belong to current user)' })
  @ApiParam({ name: 'orderId', example: 'ORD-20240318-AB12C' })
  @ApiResponse({ status: 200, type: Order })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  findMyOrderById(@Param('orderId') orderId: string): Promise<Order> {
    // TODO: replace DEV_USER_ID with @CurrentUser('_id') userId: Types.ObjectId
    return this.ordersService.findMyOrderById(orderId, DEV_USER_ID);
  }

  @Patch('my/:orderId/cancel')
  @ApiOperation({
    summary: 'Cancel an order',
    description:
      'Only allowed when status is `new` or `processing`. ' +
      'Orders that are already shipped or cancelled cannot be cancelled.',
  })
  @ApiParam({ name: 'orderId', example: 'ORD-20240318-AB12C' })
  @ApiResponse({ status: 200, type: Order })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled in its current status.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  cancelMyOrder(@Param('orderId') orderId: string): Promise<Order> {
    // TODO: replace DEV_USER_ID with @CurrentUser('_id') userId: Types.ObjectId
    return this.ordersService.cancelMyOrder(orderId, DEV_USER_ID);
  }

  @Patch('my/:orderId/shipping-address')
  @ApiOperation({
    summary: 'Update shipping address for an order',
    description:
      'Only allowed when order is still `new` or `processing`. ' +
      'Orders that are already shipped or cancelled cannot be modified.',
  })
  @ApiParam({ name: 'orderId', example: 'ORD-20240318-AB12C' })
  @ApiResponse({ status: 200, type: Order })
  @ApiResponse({ status: 400, description: 'Address cannot be changed in current status.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  updateShippingAddress(
    @Param('orderId') orderId: string,
    @Body() dto: UpdateShippingAddressDto,
  ): Promise<Order> {
    // TODO: replace DEV_USER_ID with @CurrentUser('_id') userId: Types.ObjectId
    return this.ordersService.updateShippingAddress(orderId, DEV_USER_ID, dto);
  }
}
