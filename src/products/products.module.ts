import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose/dist/mongoose.module';

import { ProductsController } from '@/products/products.controller';

import { Product, ProductSchema } from './entities/product.schema';
import { ProductsResolver } from './products.resolver';
import { ProductsService } from './products.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }])],
  providers: [ProductsService, ProductsResolver],
  exports: [ProductsService, MongooseModule],
  controllers: [ProductsController],
})
export class ProductsModule {}
