import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

import { ExportService } from './export.service';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags('Export')
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('products')
  @ApiOperation({ summary: 'Export all products to Excel (.xlsx)' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @ApiResponse({ status: 200, description: 'Returns an .xlsx file' })
  async exportProducts(@Res() res: Response): Promise<void> {
    const buffer = await this.exportService.exportProductsToExcel();

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="products.xlsx"',
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Export all orders to Excel (.xlsx)' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @ApiResponse({ status: 200, description: 'Returns an .xlsx file' })
  async exportOrders(@Res() res: Response): Promise<void> {
    const buffer = await this.exportService.exportOrdersToExcel();

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="orders.xlsx"',
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
