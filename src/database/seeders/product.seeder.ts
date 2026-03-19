import { faker } from '@faker-js/faker';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Category, CategoryDocument } from '@/categories/entities/categories.schema';
import { Product, ProductDocument } from '@/products/entities/product.schema';
import { ProductStatus } from '@/products/enums/product-status.enum';

@Injectable()
export class ProductSeeder {
  private readonly logger = new Logger(ProductSeeder.name);

  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async seed(clear: boolean = false) {
    if (clear) {
      this.logger.log('Clearing existing products...');
      await this.productModel.deleteMany({});
      this.logger.log('Products cleared.');
    }

    this.logger.log('Starting products seeding...');

    const categories = await this.categoryModel.find().select('_id depth title').lean();

    if (categories.length === 0) {
      throw new Error('No categories found. Seed categories before seeding products.');
    }

    const assignableCategories = categories.filter((category) => category.depth === 2);
    const availableCategories = assignableCategories.length > 0 ? assignableCategories : categories;
    const guaranteedCategories = faker.helpers.shuffle([...categories]);

    const techImages = [
      'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800&h=1200&fit=crop',
      'https://plus.unsplash.com/premium_photo-1680539292648-e03dfae3e345?w=800&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1650580809796-39361e4d77f6?w=800&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1638464767146-0faa5d6b8db9?w=800&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1761294364501-3edc4490ff21?w=800&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1588800347304-ec7e6f353327?w=800&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1608111681112-bf7cc550715a?w=800&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1605899435973-ca2d1a8861cf?w=800&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1706300896423-7d08346e8dbb?w=800&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1720048170558-412a8b62560e?w=800&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1621164071312-67bb68821b3f?w=800&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1627509493009-9249a2ad2459?w=800&h=1200&fit=crop',
    ];

    const productsToCreate = Math.max(50, guaranteedCategories.length);
    const products: Partial<Product>[] = [];
    const last = await this.productModel.findOne().sort({ productCode: -1 }).select('productCode');

    let nextNumber = last?.productCode ? Number(last.productCode) + 1 : 1;

    for (let i = 0; i < productsToCreate; i++) {
      const productCode = String(nextNumber).padStart(7, '0');
      nextNumber++;

      const categoriesForProduct =
        i < guaranteedCategories.length
          ? [
              guaranteedCategories[i]._id,
              ...faker.helpers.arrayElements(
                availableCategories
                  .filter(
                    (category) => String(category._id) !== String(guaranteedCategories[i]._id),
                  )
                  .map((category) => category._id),
                faker.number.int({ min: 0, max: 2 }),
              ),
            ]
          : faker.helpers.arrayElements(
              availableCategories.map((category) => category._id),
              faker.number.int({ min: 1, max: 3 }),
            );

      const product = {
        productCode,
        title: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        price: parseFloat(faker.commerce.price({ min: 100, max: 2000 })),
        status: faker.helpers.arrayElement([
          ProductStatus.ACTIVE,
          ProductStatus.INACTIVE,
          ProductStatus.DRAFT,
        ]),
        imageUrl: faker.helpers.arrayElement(techImages),
        categories: categoriesForProduct,
      };

      products.push(product as unknown as Partial<Product>);
    }

    await this.productModel.insertMany(products);
    this.logger.log(
      `Successfully seeded ${productsToCreate} products with ${guaranteedCategories.length} guaranteed category assignments!`,
    );
  }
}
