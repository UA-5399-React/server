import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { MailService } from '@/mailer/mailer.service';
import { Product, ProductSchema } from '@/products/entities/product.schema';

import { Order, OrderSchema } from './entities';
import { OrdersController } from './orders.controller';
import { OrdersResolver } from './orders.resolver';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersResolver, MailService],
  exports: [OrdersService],
})
export class OrdersModule {}
