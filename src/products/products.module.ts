import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product, ProductSchema } from './entities/product.schema';
import { MongooseModule } from '@nestjs/mongoose/dist/mongoose.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }])],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
