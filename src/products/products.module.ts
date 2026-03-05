import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose/dist/mongoose.module';

import { Product, ProductSchema } from './entities/product.schema';
import { ProductsService } from './products.service';
import { ProductsResolver } from './products-resolver';

@Module({
  imports: [MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }])],
  providers: [ProductsService, ProductsResolver],
  exports: [ProductsService, MongooseModule],
})
export class ProductsModule {}
