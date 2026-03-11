import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Category, CategoryDocument } from '@/categories/entities/categories.schema';

@Injectable()
export class CategorySeeder {
  private readonly logger = new Logger(CategorySeeder.name);

  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async seed(clear: boolean = false) {
    if (clear) {
      this.logger.log('Crearing existing products...');
      await this.categoryModel.deleteMany({});
      this.logger.log('Products cleared.');
    }

    this.logger.log('Starting categories seeding...');

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

    const rootCategoryDefs = [
      { title: 'Laptop', description: 'Portable computers for work and play' },
      { title: 'Smartphone', description: 'Mobile phones and flagship devices' },
      { title: 'Audio', description: 'Headphones, speakers, and sound systems' },
      { title: 'Accessories', description: 'Cables, cases, chargers and more' },
      { title: 'Gaming', description: 'Consoles, peripherals and gaming gear' },
      { title: 'Apple', description: 'Apple ecosystem products' },
      { title: 'Samsung', description: 'Samsung ecosystem products' },
    ];

    const subCategoryDefs: Record<string, string[]> = {
      Laptop: ['Gaming Laptops', 'Ultrabooks', 'Business Laptops', '2-in-1 Laptops'],
      Smartphone: ['Android Phones', 'iPhones', 'Budget Phones', 'Foldable Phones'],
      Audio: ['Over-Ear Headphones', 'In-Ear Headphones', 'Bluetooth Speakers', 'Soundbars'],
      Accessories: ['Chargers & Cables', 'Phone Cases', 'Screen Protectors', 'Laptop Bags'],
      Gaming: ['Consoles', 'Gaming Mice', 'Mechanical Keyboards', 'Gaming Headsets'],
      Apple: ['iPhone', 'MacBook', 'iPad', 'Apple Watch', 'AirPods'],
      Samsung: ['Galaxy S Series', 'Galaxy A Series', 'Galaxy Watch', 'Galaxy Buds'],
    };

    // Insert root categories
    const rootDocs = await this.categoryModel.insertMany(
      rootCategoryDefs.map((cat, i) => ({
        title: cat.title,
        description: cat.description,
        imageUrl: techImages[i % techImages.length],
        depth: 1,
        parent: null,
      })),
    );

    this.logger.log(`Inserted ${rootDocs.length} root categories.`);

    // Build a title → _id map for easy parent lookup
    const rootIdByTitle = Object.fromEntries(rootDocs.map((doc) => [doc.title, doc._id]));

    // Build subcategory documents
    const subDocs: Partial<Category>[] = [];
    let imageIndex = 0;

    for (const [parentTitle, children] of Object.entries(subCategoryDefs)) {
      const parentId = rootIdByTitle[parentTitle];
      for (const childTitle of children) {
        subDocs.push({
          title: childTitle,
          imageUrl: techImages[imageIndex % techImages.length],
          description: `${childTitle} — subcategory of ${parentTitle}`,
          parent: parentId,
          depth: 2,
        });
        imageIndex++;
      }
    }

    await this.categoryModel.insertMany(subDocs);
    this.logger.log(`Inserted ${subDocs.length} subcategories.`);

    this.logger.log(`Successfully seeded ${rootDocs.length + subDocs.length} categories!`);
  }
}
