import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose/dist/mongoose.module';

import { Category, CategorySchema } from '@/categories/entities/categories.schema';
import { ProductsController } from '@/products/products.controller';

import { Product, ProductSchema } from './entities/product.schema';
import { ValidateProductCategoriesPipe } from './pipes/validate-product-categories.pipe';
import { ProductsResolver } from './products.resolver';
import { ProductsService } from './products.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  providers: [ProductsService, ProductsResolver, ValidateProductCategoriesPipe],
  exports: [ProductsService, MongooseModule],
  controllers: [ProductsController],
})
export class ProductsModule {}
