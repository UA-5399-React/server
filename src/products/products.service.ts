import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { ProductsQueryArgs } from '@/products/graphql/product-query.args';
import { GqlFilters } from '@/products/graphql/products-filter.type';
import { UpdateProductInput } from '@/products/graphql/update-product.input';

import { CreateProductDto } from './dto/create-product.dto';
import { GetProductsQueryDto } from './dto/get-products.query.dto';
import { Product, ProductDocument } from './entities/product.schema';
import { ProductStatus } from './enums/product-status.enum';

@Injectable()
export class ProductsService {
  constructor(@InjectModel(Product.name) private productModel: Model<ProductDocument>) {}

  async findAll(query: GetProductsQueryDto | ProductsQueryArgs) {
    // Extract pagination parameters with fallback defults
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    // Calculate how many documents should be skipped
    const skip = (page - 1) * limit;

    const q = query as GetProductsQueryDto & Partial<ProductsQueryArgs>;
    const filterInput = (q.filter ?? q) as GqlFilters;

    // Initialize MongoDB filter object
    const filter: Record<string, any> = {};

    // Product search
    const search = q.search?.trim();

    if (search) {
      // Searches in title, description, categories, productCode fields
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { categories: { $regex: search, $options: 'i' } },
        { productCode: search },
      ];
    }

    // Category filter
    const categories = filterInput.category?.map((c) => c.trim()).filter(Boolean);
    if (categories?.length) {
      // exact match in categories array
      filter.categories = { $in: categories };
    }

    // Price range
    const { minPrice, maxPrice } = filterInput;

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

    // Status filter
    if (filterInput.status) {
      filter.status = filterInput.status;
    }

    // Date filter
    const { from, to } = this.parseDateRange(filterInput.updatedFrom, filterInput.updatedTo);

    if (from || to) {
      filter.updatedAt = {
        ...(from !== undefined ? { $gte: from } : {}),
        ...(to !== undefined ? { $lte: to } : {}),
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
    const productCode = await this.generateCode();

    return this.productModel.create({
      ...createProductDto,
      productCode,
    });
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
    const productCode = await this.generateCode();

    const duplicated = new this.productModel({
      imageUrl: source.imageUrl,
      imagePublicId: source.imagePublicId,
      title: `${source.title} (Copy)`,
      categories: [...source.categories],
      description: source.description,
      price: source.price,
      status: ProductStatus.DRAFT,
      productCode,
    });

    return duplicated.save();
  }

  async changeStatus(id: string, status: ProductStatus): Promise<Product> {
    const product = await this.productModel.findByIdAndUpdate(id, { status }, { new: true }).exec();

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

  private parseDate(value?: unknown) {
    const date =
      value instanceof Date ? value : typeof value === 'string' ? new Date(value) : undefined;

    if (date && Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }

    return date;
  }

  private parseDateRange(dateFrom?: unknown, dateTo?: unknown) {
    const from = this.parseDate(dateFrom);
    const to = this.parseDate(dateTo);

    if (from && to && from > to) {
      throw new BadRequestException('Invalid date range: updatedFrom must be <= updatedTo');
    }

    return { from, to };
  }

  async getCategories(): Promise<string[]> {
    const raw = await this.productModel.distinct('categories');
    return raw
      .map((c) => (typeof c === 'string' ? c.trim() : ''))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }

  private async generateCode(): Promise<string> {
    const lastProduct = await this.productModel
      .findOne({ productCode: /^\d+$/ })
      .sort({ productCode: -1 })
      .select('productCode');

    const startNumber = 1;
    const lastNumericCode = Number.parseInt(lastProduct?.productCode ?? '', 10);
    const nextCode = Number.isNaN(lastNumericCode) ? startNumber : lastNumericCode + 1;

    return nextCode.toString().padStart(7, '0');
  }
}
