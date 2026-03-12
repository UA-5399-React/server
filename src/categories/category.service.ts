import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Category, CategoryDocument } from './entities/categories.schema';

@Injectable()
export class CategoryService {
  constructor(@InjectModel(Category.name) private categoryModel: Model<CategoryDocument>) {}

  async findAll() {
    const categories = await this.categoryModel.find().exec();
    if (!categories) {
      throw new NotFoundException('No categories found');
    }
    return categories;
  }
}
