import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Category, CategoryDocument } from './entities/categories.schema';
import { CreateCategoryInput } from './graphql/create-category.input';
import { UpdateCategoryInput } from './graphql/update-category.input';

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

  async findOne(id: string) {
    const category = await this.categoryModel.findById(id).exec();

    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    return category;
  }

  async create(createCategoryInput: CreateCategoryInput) {
    const createdCategory = new this.categoryModel({
      ...createCategoryInput,
      parent: createCategoryInput.parent || null,
    });
    return createdCategory.save();
  }

  async update(updateCategoryInput: UpdateCategoryInput) {
    const { _id, ...updateData } = updateCategoryInput;

    const updatedCategory = await this.categoryModel.findByIdAndUpdate(
      _id,
      {
        ...updateData,
        ...(updateData.parent !== undefined ? { parent: updateData.parent || null } : {}),
      },
      { new: true },
    );

    if (!updatedCategory) {
      throw new NotFoundException(`Category with id ${_id} not found`);
    }
    return updatedCategory;
  }

  async remove(id: string) {
    const deletedCategory = await this.categoryModel.findByIdAndDelete(id).exec();

    if (!deletedCategory) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    return deletedCategory;
  }
}
