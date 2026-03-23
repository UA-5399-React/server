import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { OrdersResolver } from '@/orders/orders.resolver';
import { Product, ProductSchema } from '@/products/entities/product.schema';

import { Order, OrderSchema } from './entities';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersResolver],
})
export class OrdersModule {}
