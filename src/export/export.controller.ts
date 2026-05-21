import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

import { ExportOrdersQueryDto } from './dto/export-orders-query.dto';
import { ExportProductsQueryDto } from './dto/export-products-query.dto';
import { ExportService } from './export.service';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags('Export')
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('products')
  @ApiOperation({ summary: 'Export filtered products to Excel (.xlsx)' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @ApiResponse({ status: 200, description: 'Returns an .xlsx file' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by product status' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by title, description or productCode',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    isArray: true,
    description: 'Filter by category IDs',
  })
  @ApiQuery({ name: 'minPrice', required: false, description: 'Minimum price filter' })
  @ApiQuery({ name: 'maxPrice', required: false, description: 'Maximum price filter' })
  @ApiQuery({
    name: 'dateType',
    required: false,
    enum: ['createdAt', 'updatedAt'],
    description: 'Date field to filter on',
  })
  @ApiQuery({ name: 'updatedFrom', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'updatedTo', required: false, description: 'End date (ISO string)' })
  async exportProducts(
    @Query() query: ExportProductsQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.exportService.exportProductsToExcel(query);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="products.xlsx"',
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Export filtered orders to Excel (.xlsx)' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @ApiResponse({ status: 200, description: 'Returns an .xlsx file' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by order status' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by orderId or customer email' })
  async exportOrders(@Query() query: ExportOrdersQueryDto, @Res() res: Response): Promise<void> {
    const buffer = await this.exportService.exportOrdersToExcel(query);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="orders.xlsx"',
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
