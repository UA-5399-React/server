import { NestFactory } from '@nestjs/core';

import { UserSeeder } from '@/database/seeders/user.seeder';

//import { ProductSeeder } from '../../product.seeder';
import { AppModule } from './app.module';
import { CategorySeeder } from './database/seeders/categories.seeder';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const args = process.argv.slice(2);
    const shouldClear = args.includes('--clear');
    const only = args.find((a) => a.startsWith('--only='))?.split('=')[1]; // --only=categories | --only=products

    const userSeeder = app.get(UserSeeder);
    //const productSeeder = app.get(ProductSeeder);
    const categorySeeder = app.get(CategorySeeder);

    if (!only || only === 'users') {
      await userSeeder.seed(shouldClear);
    }

    if (!only || only === 'categories') {
      await categorySeeder.seed(shouldClear);
    }

    /*if (!only || only === 'products') {
      await productSeeder.seed(shouldClear);
    }*/

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed!', error);
    await app.close();
    process.exit(1);
  }
}
bootstrap();
