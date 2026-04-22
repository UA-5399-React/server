import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

import { AddFeaturedProductDto } from './dto/add-featured-product.dto';
import { FeaturedProductType } from './enums/featured-product-type.enum';
import { FeaturedProductsService } from './featured-products.service';

@ApiTags('Featured Products')
@Controller('featured-products')
export class FeaturedProductsController {
  constructor(private readonly service: FeaturedProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List all featured products (admin)' })
  listAll() {
    return this.service.listAll();
  }

  @Get('new-arrivals')
  @ApiOperation({ summary: 'Get manually curated New Arrivals list' })
  @ApiResponse({ status: 200, description: 'New arrivals ordered by position' })
  getNewArrivals() {
    return this.service.getNewArrivals();
  }

  @Get('hot')
  @ApiOperation({ summary: 'Get top 10 hot products sorted by purchase count' })
  @ApiResponse({ status: 200, description: 'Products ranked by purchase count (excl. cancelled)' })
  getHotProducts() {
    return this.service.getHotProducts();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a product to featured list (admin)' })
  @ApiResponse({ status: 201, description: 'Product added to featured' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Already featured' })
  add(@Body() dto: AddFeaturedProductDto) {
    return this.service.add(dto);
  }

  @Delete(':productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a product from featured list (admin)' })
  @ApiParam({ name: 'productId', description: 'Product MongoDB ObjectId' })
  @ApiQuery({ name: 'type', enum: FeaturedProductType })
  @ApiResponse({ status: 200, description: 'Removed from featured' })
  @ApiResponse({ status: 404, description: 'Featured product not found' })
  remove(@Param('productId') productId: string, @Query('type') type: FeaturedProductType) {
    return this.service.remove(productId, type);
  }

  @Patch('reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update featured products positions' })
  async reorder(@Body() dto: { productId: string; position: number }[]) {
    await this.service.updatePositions(dto);
    return { success: true };
  }
}
