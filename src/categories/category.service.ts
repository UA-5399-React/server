import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Product, ProductDocument } from '@/products/entities/product.schema';

import { Category, CategoryDocument } from './entities/categories.schema';
import { CategoriesQueryArgs } from './graphql/category-query.args';
import { CreateCategoryInput } from './graphql/create-category.input';
import { UpdateCategoryInput } from './graphql/update-category.input';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async findAll() {
    const categories = await this.categoryModel.find().exec();
    if (!categories) {
      throw new NotFoundException('No categories found');
    }
    return categories;
  }

  async findPage(query: CategoriesQueryArgs) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const parentFilter = this.buildParentFilter(query.search);

    const [parents, total] = await Promise.all([
      this.categoryModel.find(parentFilter).sort({ updatedAt: -1 }).skip(skip).limit(limit).exec(),
      this.categoryModel.countDocuments(parentFilter).exec(),
    ]);

    const parentIds = parents.map((parent) => new Types.ObjectId(parent._id));
    const children =
      parentIds.length > 0
        ? await this.categoryModel
            .find({ parent: { $in: parentIds } })
            .sort({ updatedAt: -1 })
            .exec()
        : [];

    return {
      items: [...parents, ...children],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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
    const childrenCount = await this.categoryModel.countDocuments({ parent: id }).exec();

    if (childrenCount > 0) {
      throw new BadRequestException('Cannot delete category with subcategories');
    }

    const categoryObjectId = new Types.ObjectId(id);

    await this.productModel
      .updateMany({ categories: categoryObjectId }, { $pull: { categories: categoryObjectId } })
      .exec();

    const deletedCategory = await this.categoryModel.findByIdAndDelete(id).exec();

    if (!deletedCategory) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    return deletedCategory;
  }

  private buildParentFilter(search?: string): Record<string, unknown> {
    const normalizedSearch = search?.trim();

    if (!normalizedSearch) {
      return { depth: 1 };
    }

    return {
      depth: 1,
      $or: [
        { title: { $regex: normalizedSearch, $options: 'i' } },
        { description: { $regex: normalizedSearch, $options: 'i' } },
      ],
    };
  }
}
