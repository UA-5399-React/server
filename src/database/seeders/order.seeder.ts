import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AppLogger } from '@/logger/app-logger.service';
import { Order, OrderDocument } from '@/orders/entities';
import { OrderStatus, PaymentMethod, PaymentStatus, ShippingCarrier } from '@/orders/enums';
import { Product, ProductDocument } from '@/products/entities/product.schema';
import { ProductStatus } from '@/products/enums/product-status.enum';
import { User, UserDocument } from '@/users/entities/user.schema';
import { Role } from '@/users/enums/role.enum';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const UKRAINIAN_CITIES = [
  'Kyiv',
  'Lviv',
  'Kharkiv',
  'Odesa',
  'Dnipro',
  'Zaporizhzhia',
  'Vinnytsia',
  'Chernivtsi',
  'Poltava',
  'Sumy',
];

const PAYMENT_STATUS_BY_ORDER: Record<OrderStatus, PaymentStatus> = {
  [OrderStatus.NEW]: PaymentStatus.PAID,
  [OrderStatus.PROCESSING]: PaymentStatus.PAID,
  [OrderStatus.SHIPPING]: PaymentStatus.PAID,
  [OrderStatus.COMPLETED]: PaymentStatus.PAID,
  [OrderStatus.CANCELLED]: PaymentStatus.FAILED,
};

// ─── Seeder ───────────────────────────────────────────────────────────────────
@Injectable()
export class OrderSeeder {
  private readonly logger = new AppLogger();

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async seed(clear: boolean = false): Promise<void> {
    // Dynamic import for deployment / standalone seeding
    const { faker } = await import('@faker-js/faker');

    // Local helper to generate unique orderId
    function generateOrderId(index: number): string {
      const date = faker.date.recent({ days: 90 });
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      return `ORD-${dateStr}-${String(index).padStart(4, '0')}`;
    }

    if (clear) {
      this.logger.log('Clearing existing orders...');
      await this.orderModel.deleteMany({});
      this.logger.log('Orders cleared.');
    }

    this.logger.log('Starting orders seeding...');

    const activeProducts = await this.productModel
      .find({ status: ProductStatus.ACTIVE })
      .select('_id title imageUrl price')
      .lean();

    if (activeProducts.length === 0) {
      this.logger.warn('No active products found. Run product seeder first.');
      return;
    }

    // Ensure users have firstName and lastName
    const customers = await this.userModel
      .find({
        role: Role.CUSTOMER,
        firstName: { $exists: true, $ne: null },
        lastName: { $exists: true, $ne: null },
      })
      .select('_id firstName lastName email phone')
      .lean();

    if (customers.length === 0) {
      this.logger.warn('No customers with valid names found. Run user seeder first.');
      return;
    }

    const ordersToCreate = 30;
    const orders: Partial<Order>[] = [];

    const lastOrder = await this.orderModel
      .findOne()
      .sort({ orderId: -1 })
      .select('orderId')
      .lean();

    let nextIndex = lastOrder?.orderId
      ? parseInt(lastOrder.orderId.split('-').at(-1) ?? '0', 10) + 1
      : 1;

    for (let i = 0; i < ordersToCreate; i++) {
      const orderStatus = faker.helpers.arrayElement(Object.values(OrderStatus));
      const paymentMethod = faker.helpers.arrayElement(Object.values(PaymentMethod));
      const paymentStatus = PAYMENT_STATUS_BY_ORDER[orderStatus];

      const customer = faker.helpers.arrayElement(customers);

      const firstName = customer.firstName || faker.person.firstName();
      const lastName = customer.lastName || faker.person.lastName();

      const pickedProducts = faker.helpers.arrayElements(
        activeProducts,
        faker.number.int({ min: 1, max: 4 }),
      );

      const items = pickedProducts.map((p) => ({
        product: p._id,
        title: p.title,
        imageUrl: p.imageUrl,
        unitPrice: p.price,
        amount: faker.number.int({ min: 1, max: 3 }),
      }));

      const amount = items.reduce((sum, item) => sum + item.unitPrice * item.amount, 0);

      orders.push({
        orderId: generateOrderId(nextIndex++),
        userId: customer._id,
        items,
        amount: parseFloat(amount.toFixed(2)),
        totalPrice: parseFloat(amount.toFixed(2)),
        shippingAddress: {
          carrier: faker.helpers.arrayElement(Object.values(ShippingCarrier)),
          city: faker.helpers.arrayElement(UKRAINIAN_CITIES),
          branchNumber: String(faker.number.int({ min: 1, max: 250 })),
        },
        status: orderStatus,
        user: {
          firstName,
          lastName,
          email: customer.email,
          phone: customer.phone ?? faker.phone.number(),
        },
        payment: {
          method: paymentMethod,
          status: paymentStatus,
          ...(paymentMethod === PaymentMethod.STRIPE && {
            stripePaymentIntentId: `pi_${faker.string.alphanumeric(24)}`,
          }),
        },
        ...(faker.datatype.boolean(0.3) && {
          message: faker.helpers.arrayElement([
            'Please call before delivery.',
            'Leave at the door.',
            'Fragile, handle with care.',
            'Gift wrapping please.',
          ]),
        }),
      });
    }

    await this.orderModel.insertMany(orders);
    this.logger.log(`Successfully seeded ${ordersToCreate} orders! 🎉`);
  }
}
