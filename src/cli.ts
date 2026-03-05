import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { ProductSeeder } from './database/seeders/product.seeder';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const args = process.argv.slice(2);
    const shouldClear = args.includes('--clear');

    const productSeeder = app.get(ProductSeeder);

    await productSeeder.seed(shouldClear);

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed!', error);
    await app.close();
    process.exit(1);
  }
}
bootstrap();
