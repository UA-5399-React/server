import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { AppModule } from '@/app.module';

function isObjectId(value: unknown): boolean {
  return (
    value instanceof Types.ObjectId || (typeof value === 'string' && /^[a-f\d]{24}$/i.test(value))
  );
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const productModel = app.get<Model<any>>(getModelToken('Product'));
  const categoryModel = app.get<Model<any>>(getModelToken('Category'));

  console.log('Connected via NestJS\n');

  const categories = await categoryModel.find().lean();

  const categoryMap: Record<string, Types.ObjectId> = {};
  for (const cat of categories) {
    if (cat.title) {
      categoryMap[cat.title.toLowerCase()] = cat._id;
    }
  }

  console.log(`Loaded ${Object.keys(categoryMap).length} categories`);

  const products = await productModel.find();
  console.log(`Found ${products.length} products\n`);

  let migrated = 0;
  let skipped = 0;
  const failed: string[] = [];

  for (const product of products) {
    const pid = product._id.toString();
    const cats = product.categories as unknown[];

    // No categories
    if (!cats || cats.length === 0) {
      skipped++;
      continue;
    }

    // Already migrated
    if (cats.every(isObjectId)) {
      skipped++;
      continue;
    }

    const categoryNames = cats as string[];

    // Check for missing categories
    const unmatched = categoryNames.filter((n) => !categoryMap[n.toLowerCase()]);

    if (unmatched.length > 0) {
      console.warn(`[SKIP] Product ${pid}: unmatched → [${unmatched.join(', ')}]`);
      failed.push(pid);
      continue;
    }

    const categoryIds = categoryNames.map((name) => categoryMap[name.toLowerCase()]);

    await productModel.updateOne({ _id: product._id }, { $set: { categories: categoryIds } });

    migrated++;

    console.log(`[OK] Product ${pid} → [${categoryIds.map((id) => id.toString()).join(', ')}]`);
  }

  console.log('\n── Migration complete ──────────────────────────────');
  console.log(`Migrated : ${migrated}`);
  console.log(`Skipped  : ${skipped}`);
  console.log(`Failed   : ${failed.length}`);

  if (failed.length > 0) {
    console.warn(`Failed IDs:\n${failed.join('\n')}`);
  }

  await app.close();
}

bootstrap().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
