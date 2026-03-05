import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { UpdateProductInput } from '@/products/graphql/update-product.input';

import { CreateProductDto } from './dto/create-product.dto';
import { GetProductsQueryDto } from './dto/get-products.query.dto';
import { Product, ProductDocument } from './entities/product.schema';
import { ProductStatus } from './enums/product-status.enum';

@Injectable()
export class ProductsService {
  constructor(@InjectModel(Product.name) private productModel: Model<ProductDocument>) {}

  async findAll(query: GetProductsQueryDto) {
    // Extract pagination parameters with fallback defaults
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    // Calculate how many documents should be skipped
    const skip = (page - 1) * limit;

    // Initialize MongoDB filter object
    const filter: Record<string, any> = {};

    // Trim search keyword to avoid unnecessary spaces
    const search = query.search?.trim();

    if (search) {
      // Searches in title, description and tags fields
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption: Record<string, 1 | -1> = {};
    if (query.sort) sortOption[query.sort] = query.order === 'desc' ? -1 : 1;

    // Execute both queries in parallel:
    // 1) Get paginated items
    // 2) Count total matching documents
    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort(sortOption) // Sort docs if necessary
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    // Return structured paginated response
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Product> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid product id: "${id}"`);
    }
    const product = await this.productModel.findById(id).exec();

    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }
    return product;
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const createdProduct = new this.productModel(createProductDto);
    return createdProduct.save();
  }

  async update(id: string, updateProductDto: UpdateProductInput): Promise<Product> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid product id "${id}"`);
    }
    const product = await this.findOne(id);

    this.assertStatusTransitionAllowed(product.status, updateProductDto.status);

    const existingProduct = await this.productModel
      .findByIdAndUpdate(id, updateProductDto, { new: true })
      .exec();

    if (!existingProduct) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }
    return existingProduct;
  }

  async remove(id: string): Promise<void> {
    const product = await this.productModel.findById(id).exec();

    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }

    if (product.status !== ProductStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot delete product with status "${product.status}". Only draft products can be deleted.`,
      );
    }

    await this.productModel.findByIdAndDelete(id).exec();
  }

  private assertStatusTransitionAllowed(current: ProductStatus, next?: ProductStatus) {
    if (next === undefined) return;

    if (next === ProductStatus.DRAFT && current !== ProductStatus.DRAFT) {
      throw new BadRequestException('Cannot revert product to draft');
    }
  }
}
