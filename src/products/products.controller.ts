import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CreateProductDto } from './dto/create-product.dto';
import { GetProductsQueryDto } from './dto/get-products.query.dto';
import { PaginatedProductsDto } from './dto/paginated-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.schema';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Get products with search and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated products list', type: PaginatedProductsDto })
  findAll(@Query() query: GetProductsQueryDto): Promise<PaginatedProductsDto> {
    // Delegates search and pagination logic to the service layer
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiParam({ name: 'id', description: 'Product MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Product found', type: Product })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(@Param('id') id: string): Promise<Product> {
    return this.productsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created', type: Product })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  create(@Body() createProductDto: CreateProductDto): Promise<Product> {
    return this.productsService.create(createProductDto);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate an existing product' })
  @ApiParam({ name: 'id', description: 'Product MongoDB ObjectId' })
  @ApiResponse({ status: 201, description: 'Product duplicated', type: Product })
  @ApiResponse({ status: 404, description: 'Product not found' })
  duplicate(@Param('id') id: string): Promise<Product> {
    return this.productsService.duplicate(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing product' })
  @ApiParam({ name: 'id', description: 'Product MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Product updated', type: Product })
  @ApiResponse({ status: 404, description: 'Product not found' })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto): Promise<Product> {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product' })
  @ApiParam({ name: 'id', description: 'Product MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete active or inactive product' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.productsService.remove(id);
    return { message: 'Product deleted successfully' };
  }
}
