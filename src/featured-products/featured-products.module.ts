import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Order, OrderSchema } from '@/orders/entities/order.schema';
import { Product, ProductSchema } from '@/products/entities/product.schema';

import { FeaturedProduct, FeaturedProductSchema } from './entities/featured-product.schema';
import { FeaturedProductsController } from './featured-products.controller';
import { FeaturedProductsService } from './featured-products.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeaturedProduct.name, schema: FeaturedProductSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [FeaturedProductsController],
  providers: [FeaturedProductsService],
  exports: [FeaturedProductsService],
})
export class FeaturedProductsModule {}
