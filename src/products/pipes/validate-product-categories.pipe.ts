import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Category, CategoryDocument } from '@/categories/entities/categories.schema';

import { CreateProductInput } from '../graphql/create-product.input';

@Injectable()
export class ValidateProductCategoriesPipe implements PipeTransform {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async transform(
    value: CreateProductInput,
    _metadata: ArgumentMetadata,
  ): Promise<CreateProductInput> {
    void _metadata;
    const categories = value.categories;

    // skip validation if categories are not provided
    if (!categories || categories.length === 0) {
      return value;
    }

    const uniqueCategoryIds = [...new Set(categories)];

    const allIdsAreValid = uniqueCategoryIds.every((id) => Types.ObjectId.isValid(id));

    if (!allIdsAreValid) {
      throw new BadRequestException('Categories must contain valid category IDs');
    }

    const existingCategoriesCount = await this.categoryModel.countDocuments({
      _id: { $in: uniqueCategoryIds },
    });

    if (existingCategoriesCount !== uniqueCategoryIds.length) {
      throw new BadRequestException('One or more categories do not exist');
    }

    return value;
  }
}
