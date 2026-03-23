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

    const testUser = await this.userModel.findOne({ email: 'customer@test.com' });

    if (!testUser) {
      this.logger.warn('Test user customer@test.com not found. Skipping cart seeding.');
      return;
    }

    const products = await this.productModel.find({ status: ProductStatus.ACTIVE }).limit(3).exec();

    if (products.length === 0) {
      this.logger.warn('No active products found. Skipping cart seeding.');
      return;
    }

    const cartItems = products.map((product, index) => ({
      product: product._id,
      quantity: index + 1,
    }));

    await this.cartModel.findOneAndUpdate(
      { userId: testUser._id },
      { items: cartItems },
      { upsert: true, returnDocument: 'after' },
    );

    this.logger.log(
      `Successfully seeded cart for ${testUser.email} with ${cartItems.length} items.`,
    );
  }
}
