import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './entities/product.schema';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // GET /products
  @Get()
  findAll(): Promise<Product[]> {
    return this.productsService.findAll();
  }

  // GET /products/:id
  @Get(':id')
  findOne(@Param('id') id: string): Promise<Product> {
    return this.productsService.findOne(id);
  }

  // POST /products
  @Post()
  create(@Body() body: Omit<Product, 'id'>): Promise<Product> {
    return this.productsService.create(body);
  }

  // PATCH /products/:id
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<Omit<Product, 'id'>>): Promise<Product> {
    return this.productsService.update(id, body);
  }

  // DELETE /products/:id
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.productsService.remove(id);
    return { message: 'Product deleted successfully' };
  }
}
