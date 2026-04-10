import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose/dist/mongoose.module';

import { Category, CategorySchema } from '@/categories/entities/categories.schema';
import { Order, OrderSchema } from '@/orders/entities/order.schema';
import { ProductsController } from '@/products/products.controller';

import { Product, ProductSchema } from './entities/product.schema';
import { ValidateProductCategoriesPipe } from './pipes/validate-product-categories.pipe';
import { ProductsResolver } from './products.resolver';
import { ProductsService } from './products.service';
import { ProductsAdminController } from './products-admin.controller';
import { ProductsImportService } from './products-import.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  providers: [
    ProductsService,
    ProductsResolver,
    ValidateProductCategoriesPipe,
    ProductsImportService,
  ],
  exports: [ProductsService, MongooseModule],
  controllers: [ProductsController, ProductsAdminController],
})
export class ProductsModule {}
