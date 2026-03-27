import { NestFactory } from '@nestjs/core';

import { UserSeeder } from '@/database/seeders/user.seeder';

//import { OrderSeeder } from '../../order.seeder';
import { AppModule } from './app.module';
import { CartSeeder } from './database/seeders/cart.seeder';
import { CategorySeeder } from './database/seeders/categories.seeder';
import { ProductSeeder } from './database/seeders/product.seeder';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const args = process.argv.slice(2);
    const shouldClear = args.includes('--clear');
    const only = args.find((a) => a.startsWith('--only='))?.split('=')[1]; // --only=categories | --only=products

    const userSeeder = app.get(UserSeeder);
    const productSeeder = app.get(ProductSeeder);
    const categorySeeder = app.get(CategorySeeder);
    const cartSeeder = app.get(CartSeeder);
    //const orderSeeder = app.get(OrderSeeder);

    if (!only || only === 'users') {
      await userSeeder.seed(shouldClear);
    }

    if (!only || only === 'categories') {
      await categorySeeder.seed(shouldClear);
    }

    if (!only || only === 'products') {
      await productSeeder.seed(shouldClear);
    }

    if (!only || only === 'cart') {
      await cartSeeder.seed(shouldClear);
    }

    /*if (!only || only === 'orders') {
      await orderSeeder.seed(shouldClear);
    }*/

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed!', error);
    await app.close();
    process.exit(1);
  }
}
void bootstrap();
