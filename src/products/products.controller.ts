import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';

@Controller('products')
export class ProductsController {
    constructor(private readonly ProductsService: ProductsService) { }

    // GET /products
    @Get()
    findAll(): Product[] {
        return this.ProductsService.findAll();
    }

    // GET /products/:id
    @Get(':id')
    findOne(@Param('id') id: string): Product {
        return this.ProductsService.findOne(id);
    }

    // POST /products
    @Post()
    create(@Body() body: Omit<Product, 'id'>): Product {
        return this.ProductsService.create(body);
    }

    // PATCH /products/:id
    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() body: Partial<Omit<Product, 'id'>>,
    ): Product {
        return this.ProductsService.update(id, body);
    }

    // DELETE /products/:id
    @Delete(':id')
    remove(@Param("id") id: string): { message: string } {
        this.ProductsService.remove(id);
        return { message: 'Product deleted successfully' }
    }
}
