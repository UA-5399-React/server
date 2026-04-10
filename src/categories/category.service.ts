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
    const normalizedSearch = query.search?.trim();
    const matchingChildParentIds = normalizedSearch
      ? await this.findMatchingChildParentIds(normalizedSearch)
      : [];
    const parentFilter = this.buildParentFilter(normalizedSearch, matchingChildParentIds);

    const [parents, total] = await Promise.all([
      this.categoryModel.find(parentFilter).sort({ updatedAt: -1 }).skip(skip).limit(limit).exec(),
      this.categoryModel.countDocuments(parentFilter).exec(),
    ]);

    const parentIds = parents.map((parent) => String(parent._id));
    const children =
      parentIds.length > 0
        ? await this.categoryModel
            .find(this.buildChildrenFilter(parentIds, normalizedSearch))
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
      parent: this.normalizeParentId(createCategoryInput.parent),
    });
    return createdCategory.save();
  }

  async update(updateCategoryInput: UpdateCategoryInput) {
    const { _id, ...updateData } = updateCategoryInput;

    const updatedCategory = await this.categoryModel.findByIdAndUpdate(
      _id,
      {
        ...updateData,
        ...(updateData.parent !== undefined
          ? { parent: this.normalizeParentId(updateData.parent) }
          : {}),
      },
      { new: true },
    );

    if (!updatedCategory) {
      throw new NotFoundException(`Category with id ${_id} not found`);
    }
    return updatedCategory;
  }

  async remove(id: string) {
    const childrenCount = await this.categoryModel
      .countDocuments(this.buildChildrenFilter([id]))
      .exec();

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

  private async findMatchingChildParentIds(search: string): Promise<Types.ObjectId[]> {
    const matchingChildren = await this.categoryModel
      .find({
        depth: 2,
        ...this.buildTextSearchFilter(search),
      })
      .exec();

    const uniqueParentIds = new Map<string, Types.ObjectId>();

    matchingChildren.forEach((childCategory) => {
      if (!childCategory.parent) return;

      const parentId = new Types.ObjectId(childCategory.parent);
      uniqueParentIds.set(parentId.toString(), parentId);
    });

    return Array.from(uniqueParentIds.values());
  }

  private buildParentFilter(
    search?: string,
    matchingChildParentIds: Types.ObjectId[] = [],
  ): Record<string, unknown> {
    if (!search) {
      return { depth: 1 };
    }

    const searchConditions: Record<string, unknown>[] = [...this.buildTextSearchFilter(search).$or];

    if (matchingChildParentIds.length > 0) {
      searchConditions.push({ _id: { $in: matchingChildParentIds } });
    }

    return {
      depth: 1,
      $or: searchConditions,
    };
  }

  private buildChildrenFilter(parentIds: string[], search?: string): Record<string, unknown> {
    const filter: Record<string, unknown> = {
      $expr: {
        $in: [{ $toString: '$parent' }, parentIds],
      },
    };

    if (search) {
      return {
        ...filter,
        ...this.buildTextSearchFilter(search),
      };
    }

    return filter;
  }

  private buildTextSearchFilter(search: string) {
    return {
      $or: [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ],
    };
  }

  private normalizeParentId(parent?: string | null): Types.ObjectId | null {
    const normalizedParent = parent?.trim();

    if (!normalizedParent) {
      return null;
    }

    if (!Types.ObjectId.isValid(normalizedParent)) {
      throw new BadRequestException('Invalid parent category id');
    }

    return new Types.ObjectId(normalizedParent);
  }
}
