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

    // Product search
    const search = query.search?.trim();

    if (search) {
      // Searches in title, description and tags fields
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    // Category filter
    const category = query.category?.trim();
    if (category) {
      // exact match in tags array
      filter.tags = category;
    }

    // Price range
    const { minPrice, maxPrice } = query;

    // Validate min <= max only when both are provided
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      throw new BadRequestException('Invalid price range: minPrice must be <= maxPrice');
    }

    // Add price filter if at least one bound exists
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {
        ...(minPrice !== undefined ? { $gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { $lte: maxPrice } : {}),
      };
    }

    // -------------------- sorting --------------------
    const sortOption: Record<string, 1 | -1> = {};
    if (query.sort) sortOption[query.sort] = query.order === 'desc' ? -1 : 1;

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

  async duplicate(id: string): Promise<Product> {
    const source = await this.productModel.findById(id).exec();
    if (!source) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }

    const duplicated = new this.productModel({
      imageUrl: source.imageUrl,
      title: `${source.title} (Copy)`,
      tags: [...source.tags],
      description: source.description,
      price: source.price,
      status: ProductStatus.DRAFT,
    });

    return duplicated.save();
  }

  async changeStatus(id: string, status: ProductStatus): Promise<Product> {
    const product = await this.productModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();

    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }

    return product;
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
