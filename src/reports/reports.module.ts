import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Order, OrderSchema } from '@/orders/entities';
import { Product, ProductSchema } from '@/products/entities/product.schema';
import { ReportsResolver } from '@/reports/reports.resolver';
import { ReportsService } from '@/reports/reports.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  providers: [ReportsService, ReportsResolver],
  exports: [ReportsService],
})
export class ReportsModule {}
