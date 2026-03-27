import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ShippingService } from './shipping.service';
import { CityOption, WarehouseOption } from './types';

@ApiTags('Shipping')
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get('cities')
  @ApiOperation({
    summary: 'Get cities with Nova Poshta coverage',
    description:
      'Returns a flat list for a dropdown. Pass the selected city `name` to `/shipping/warehouses`.',
  })
  @ApiQuery({ name: 'search', required: false, example: 'Київ' })
  @ApiResponse({ status: 200, description: 'List of cities.' })
  getCities(@Query('search') search?: string): Promise<CityOption[]> {
    return this.shippingService.getCities(search);
  }

  @Get('warehouses')
  @ApiOperation({
    summary: 'Get Nova Poshta branches and post machines for a city',
    description:
      'Pass `city` exactly as returned by `/shipping/cities`. ' +
      'Optionally narrow results with `search`.',
  })
  @ApiQuery({ name: 'city', required: true, example: 'Київ' })
  @ApiQuery({ name: 'search', required: false, example: '42' })
  @ApiResponse({ status: 200, description: 'List of warehouses with full address.' })
  getWarehouses(
    @Query('city') city: string,
    @Query('search') search?: string,
  ): Promise<WarehouseOption[]> {
    return this.shippingService.getWarehouses(city, search);
  }
}
