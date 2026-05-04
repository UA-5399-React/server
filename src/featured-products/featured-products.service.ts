import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';

import { Order, OrderDocument } from '@/orders/entities/order.schema';
import { OrderStatus } from '@/orders/enums/order-status.enum';
import { Product, ProductDocument } from '@/products/entities/product.schema';

import { AddFeaturedProductDto } from './dto/add-featured-product.dto';
import { FeaturedProduct, FeaturedProductDocument } from './entities/featured-product.schema';
import { FeaturedProductType } from './enums/featured-product-type.enum';

const HOT_PRODUCTS_LIMIT = 10;

@Injectable()
export class FeaturedProductsService {
  constructor(
    @InjectModel(FeaturedProduct.name)
    private readonly featuredModel: Model<FeaturedProductDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  async add(dto: AddFeaturedProductDto): Promise<FeaturedProduct> {
    const productExists = await this.productModel
      .exists({ _id: new Types.ObjectId(dto.productId) })
      .exec();

    if (!productExists) {
      throw new NotFoundException(`Product with id "${dto.productId}" not found`);
    }

    const existing = await this.featuredModel
      .findOne({ productId: new Types.ObjectId(dto.productId), type: dto.type })
      .exec();

    if (existing) {
      throw new ConflictException(`Product is already featured as "${dto.type}"`);
    }

    return this.featuredModel.create({
      productId: new Types.ObjectId(dto.productId),
      type: dto.type,
      position: dto.position ?? 0,
    });
  }

  async remove(productId: string, type: FeaturedProductType): Promise<{ message: string }> {
    const result = await this.featuredModel
      .findOneAndDelete({ productId: new Types.ObjectId(productId), type })
      .exec();

    if (!result) {
      throw new NotFoundException(
        `Featured product not found for id "${productId}" and type "${type}"`,
      );
    }

    return { message: 'Removed from featured products' };
  }

  async getNewArrivals(): Promise<unknown[]> {
    return this.featuredModel
      .find({ type: FeaturedProductType.NEW_ARRIVAL })
      .sort({ position: 1 })
      .populate('productId')
      .lean()
      .exec();
  }

  async getHotProducts(): Promise<(Product & { purchaseCount: number })[]> {
    const pipeline: PipelineStage[] = [
      {
        $lookup: {
          from: this.orderModel.collection.name,
          let: { productId: '$_id' },
          pipeline: [
            { $match: { status: { $ne: OrderStatus.CANCELLED } } },
            { $unwind: '$items' },
            {
              $match: {
                $expr: { $eq: ['$items.product', '$$productId'] },
              },
            },
            {
              $group: { _id: null, purchaseCount: { $sum: '$items.amount' } },
            },
          ],
          as: 'purchaseStats',
        },
      },
      {
        $addFields: {
          purchaseCount: {
            $ifNull: [{ $arrayElemAt: ['$purchaseStats.purchaseCount', 0] }, 0],
          },
        },
      },
      { $project: { purchaseStats: 0 } },
      { $sort: { purchaseCount: -1 } },
      { $limit: HOT_PRODUCTS_LIMIT },
    ];

    return this.productModel.aggregate(pipeline).exec() as Promise<
      (Product & { purchaseCount: number })[]
    >;
  }

  async listAll(): Promise<FeaturedProduct[]> {
    return this.featuredModel.find().populate('productId').sort({ type: 1, position: 1 }).lean();
  }

  async updatePositions(reorderDto: { productId: string; position: number }[]): Promise<void> {
  const bulkOps = reorderDto.map((item) => ({
    updateOne: {
      filter: { productId: new Types.ObjectId(item.productId), type: FeaturedProductType.NEW_ARRIVAL },
      update: { $set: { position: item.position } },
    },
  }));

  await this.featuredModel.bulkWrite(bulkOps);
}
}
