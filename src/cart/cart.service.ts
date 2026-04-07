import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Product, ProductDocument } from '@/products/entities/product.schema';

import { CartResponseDto } from './dto/cart-response.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { Cart, CartDocument } from './entities/cart.schema';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name)
    private readonly cartModel: Model<CartDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async getCart(userId: string): Promise<CartResponseDto> {
    const cart = await this.cartModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate('items.product')
      .exec();

    return this.mapToResponseDto(userId, cart);
  }

  async updateCart(userId: string, updateCartDto: UpdateCartDto): Promise<CartResponseDto> {
    const userObjectId = new Types.ObjectId(userId);

    // Validate products exist
    for (const item of updateCartDto.items) {
      const product = await this.productModel.findById(item.productId);
      if (!product) {
        throw new NotFoundException(`Product with ID ${item.productId} not found`);
      }
    }

    const items = updateCartDto.items.map((item) => ({
      product: new Types.ObjectId(item.productId),
      quantity: item.quantity,
    }));

    const cart = await this.cartModel
      .findOneAndUpdate({ userId: userObjectId }, { items }, { upsert: true, new: true })
      .populate('items.product')
      .exec();

    return this.mapToResponseDto(userId, cart);
  }

  async syncCart(userId: string, updateCartDto: UpdateCartDto): Promise<CartResponseDto> {
    const userObjectId = new Types.ObjectId(userId);

    // Validate products exist
    for (const item of updateCartDto.items) {
      const product = await this.productModel.findById(item.productId);
      if (!product) {
        throw new NotFoundException(`Product with ID ${item.productId} not found`);
      }
    }

    let cart = await this.cartModel.findOne({ userId: userObjectId });

    if (!cart) {
      const items = updateCartDto.items.map((item) => ({
        product: new Types.ObjectId(item.productId),
        quantity: item.quantity,
      }));
      cart = await this.cartModel.create({ userId: userObjectId, items });
    } else {
      const existingItems = cart.items || [];
      const newItemsMap = new Map<string, number>();

      for (const existingItem of existingItems) {
        const productId = (existingItem.product as Types.ObjectId).toString();
        newItemsMap.set(productId, existingItem.quantity);
      }

      for (const incomingItem of updateCartDto.items) {
        const idStr = incomingItem.productId.toString();
        const currentQty = newItemsMap.get(idStr) || 0;
        newItemsMap.set(idStr, currentQty + incomingItem.quantity);
      }

      const mergedItems = Array.from(newItemsMap.entries()).map(([productId, quantity]) => ({
        product: new Types.ObjectId(productId),
        quantity,
      }));

      cart.set('items', mergedItems);
      await cart.save();
    }

    const populatedCart = await this.cartModel.findById(cart._id).populate('items.product').exec();

    return this.mapToResponseDto(userId, populatedCart);
  }

  private mapToResponseDto(userId: string, cart: CartDocument | null): CartResponseDto {
    const items = cart?.items || [];
    const processedItems = items.map((item) => {
      const product = item.product as unknown as Product & { _id: Types.ObjectId };
      const subtotal = (product?.price || 0) * item.quantity;
      return {
        product: {
          _id: product?._id?.toString() || '',
          title: product?.title || '',
          price: product?.price || 0,
          imageUrl: product?.imageUrl,
          productCode: product?.productCode || '',
        },
        quantity: item.quantity,
        subtotal,
      };
    });

    const total = processedItems.reduce((acc, item) => acc + item.subtotal, 0);

    return {
      userId,
      items: processedItems,
      total,
    };
  }

  async clearCart(userId: string): Promise<void> {
    const userObjectId = new Types.ObjectId(userId);
    await this.cartModel.deleteOne({ userId: userObjectId }).exec();
  }
}
