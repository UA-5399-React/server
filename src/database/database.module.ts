import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { Cart, CartSchema } from '@/cart/entities/cart.schema';
import { Category, CategorySchema } from '@/categories/entities/categories.schema';
import { UserSeeder } from '@/database/seeders/user.seeder';
import { Order, OrderSchema } from '@/orders/entities';
import { Product, ProductSchema } from '@/products/entities/product.schema';
import { User, UserSchema } from '@/users/entities/user.schema';

import { CartSeeder } from './seeders/cart.seeder';
import { CategorySeeder } from './seeders/categories.seeder';
import { ProductSeeder } from './seeders/product.seeder';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('DB_CONNECTION_LINK');
        const dbName = configService.get<string>('DB_NAME');

        if (!uri) {
          throw new Error('DB_CONNECTION_LINK is not defined in the environment variables');
        }

        if (!dbName) {
          throw new Error('DB_NAME is not defined');
        }

        return {
          uri,
          dbName,
        };
      },
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Cart.name, schema: CartSchema },
    ]),
  ],
  providers: [ProductSeeder, CategorySeeder, UserSeeder, CartSeeder],
})
export class DatabaseModule {}
