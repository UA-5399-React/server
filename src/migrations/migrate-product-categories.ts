import mongoose, { Schema, Types } from 'mongoose';

// ── Inline schema definitions (no app imports needed) ───────────────────────

const CategorySchema = new Schema({ title: String }, { strict: false });
const ProductSchema = new Schema({ categories: [Schema.Types.Mixed] }, { strict: false });

// Use existing collection names — change these if yours differ
const Category = mongoose.model('Category', CategorySchema, 'categories');
const Product = mongoose.model('Product', ProductSchema, 'products');

// ── Config ───────────────────────────────────────────────────────────────────

const DB_URI;
const DB_NAME;

// ── Helpers ───────────────────────────────────────────────────────────────────

function isObjectId(value: unknown): boolean {
  return (
    value instanceof Types.ObjectId || (typeof value === 'string' && /^[a-f\d]{24}$/i.test(value))
  );
}

// ── Migration ─────────────────────────────────────────────────────────────────

async function runMigration() {
  await mongoose.connect(DB_URI, { dbName: DB_NAME });
  console.log(`Connected to MongoDB — db: ${DB_NAME}\n`);

  // Build a name → ObjectId map from the categories collection
  const categories = await Category.find({});
  const categoryMap: Record<string, Types.ObjectId> = {};
  for (const cat of categories) {
    if (cat.title) categoryMap[cat.title.toLowerCase()] = cat._id;
  }
  console.log(`Loaded ${Object.keys(categoryMap).length} categories from DB`);

  const products = await Product.find({});
  console.log(`Found ${products.length} products to process\n`);

  let migrated = 0;
  let skipped = 0;
  const failed: string[] = [];

  for (const product of products) {
    const pid = product._id.toString();

    // Nothing to migrate
    const cats = product.categories as unknown[];
    if (!cats || cats.length === 0) {
      skipped++;
      continue;
    }
    // Already migrated — every entry is a valid ObjectId
    if ((product.categories as unknown[]).every(isObjectId)) {
      skipped++;
      continue;
    }

    const categoryNames = product.categories as unknown as string[];

    // Resolve names → ObjectIds
    const unmatched = categoryNames.filter((n) => !categoryMap[n.toLowerCase()]);
    if (unmatched.length > 0) {
      console.warn(`  [SKIP] Product ${pid}: unmatched categories → [${unmatched.join(', ')}]`);
      failed.push(pid);
      continue;
    }

    const categoryIds = categoryNames.map((name) => categoryMap[name.toLowerCase()]);

    await Product.updateOne({ _id: product._id }, { $set: { categories: categoryIds } });

    migrated++;
    console.log(`  [OK]   Product ${pid} → [${categoryIds.map((id) => id.toString()).join(', ')}]`);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n── Migration complete ──────────────────────────────');
  console.log(`  Migrated : ${migrated}`);
  console.log(`  Skipped  : ${skipped}  (already done or no categories)`);
  console.log(`  Failed   : ${failed.length}  (unmatched category names)`);
  if (failed.length > 0) {
    console.warn(`  Failed product IDs:\n    ${failed.join('\n    ')}`);
  }

  await mongoose.disconnect();
  console.log('\nDisconnected. Done.');
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
