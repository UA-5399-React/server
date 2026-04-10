import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Order, OrderSchema } from '@/orders/entities/order.schema';
import { Product, ProductSchema } from '@/products/entities/product.schema';

import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
