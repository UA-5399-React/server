import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Cart, CartDocument } from '@/cart/entities/cart.schema';
import { Product, ProductDocument } from '@/products/entities/product.schema';
import { ProductStatus } from '@/products/enums/product-status.enum';
import { User, UserDocument } from '@/users/entities/user.schema';

@Injectable()
export class CartSeeder {
  private readonly logger = new Logger(CartSeeder.name);

  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  async seed(clear: boolean = false) {
    if (clear) {
      this.logger.log('Clearing existing carts...');
      await this.cartModel.deleteMany({});
      this.logger.log('Carts cleared.');
    }

    this.logger.log('Starting cart seeding...');

    const customers = await this.userModel.find({ role: 'customer' }).exec();

    if (customers.length === 0) {
      this.logger.warn('No customers found. Skipping cart seeding.');
      return;
    }

    const products = await this.productModel.find({ status: ProductStatus.ACTIVE }).limit(5).exec();

    if (products.length === 0) {
      this.logger.warn('No products found. Skipping cart seeding.');
      return;
    }

    let cartCount = 0;
    for (const customer of customers) {
      const cartItems = products.slice(0, 2).map((product, index) => ({
        product: product._id,
        quantity: index + 1,
      }));

      await this.cartModel.findOneAndUpdate(
        { userId: customer._id },
        { items: cartItems },
        { upsert: true, returnDocument: 'after' },
      );
      cartCount++;
    }

    this.logger.log(`Cart seeding completed. Seeded ${cartCount} carts.`);
  }
}
