import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Product, ProductSchema } from '@/products/entities/product.schema';

import { CategoryController } from './category.controller';
import { CategoryResolver } from './category.resolver';
import { CategoryService } from './category.service';
import { Category, CategorySchema } from './entities/categories.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  providers: [CategoryService, CategoryResolver],
  exports: [CategoryService],
  controllers: [CategoryController],
})
export class CategoryModule {}
