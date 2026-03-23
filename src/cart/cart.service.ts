import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Product } from '@/products/entities/product.schema';

import { CartResponseDto } from './dto/cart-response.dto';
import { Cart, CartDocument } from './entities/cart.schema';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name)
    private readonly cartModel: Model<CartDocument>,
  ) {}

  async getCart(userId: string): Promise<CartResponseDto> {
    const cart = await this.cartModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate('items.product')
      .exec();

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
}
