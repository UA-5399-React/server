import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { AppLogger } from '@/logger/app-logger.service';
import { Product, ProductDocument } from '@/products/entities/product.schema';
import { ProductStatus } from '@/products/enums/product-status.enum';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateShippingAddressDto } from './dto/update-shipping-address.dto';
import { Order, OrderDocument } from './entities';
import { OrderStatus } from './enums/order-status.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { NON_CANCELLABLE_STATUSES, NON_EDITABLE_ADDRESS_STATUSES } from './orders.constants';

@Injectable()
export class OrdersService {
  private readonly logger = new AppLogger();

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  // ─── Customer ──────────────────────────────────────────────────────────────

  async create(dto: CreateOrderDto, userId: Types.ObjectId): Promise<Order> {
    const productIds = dto.items.map((item) => new Types.ObjectId(item.product));

    const products = await this.productModel
      .find({ _id: { $in: productIds }, status: ProductStatus.ACTIVE })
      .lean();

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products are unavailable or do not exist.');
    }

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const items = dto.items.map((item) => {
      const product = productMap.get(item.product)!;
      return {
        product: new Types.ObjectId(item.product),
        title: product.title,
        imageUrl: product.imageUrl,
        unitPrice: product.price,
        amount: item.amount,
      };
    });

    const amount = parseFloat(items.reduce((sum, i) => sum + i.unitPrice * i.amount, 0).toFixed(2));

    const order = await this.orderModel.create({
      orderId: this.generateOrderId(),
      userId,
      items,
      amount,
      totalPrice: amount,
      shippingAddress: dto.shippingAddress,
      user: dto.user,
      payment: {
        method: dto.paymentMethod,
        // Stripe intent will be attached after payment confirmation webhook.
      },
      message: dto.message,
    });

    this.logger.log(`Order created: ${order.orderId} by user ${userId.toString()}`);
    return order;
  }

  async findMyOrders(userId: Types.ObjectId): Promise<Order[]> {
    return this.orderModel.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  async findMyOrderById(orderId: string, userId: Types.ObjectId): Promise<Order> {
    const order = await this.orderModel.findOne({ orderId }).lean();

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }

    if (!order.userId.equals(userId)) {
      throw new ForbiddenException('Access denied.');
    }

    return order;
  }

  async cancelMyOrder(orderId: string, userId: Types.ObjectId): Promise<Order> {
    const order = await this.orderModel.findOne({ orderId });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }

    if (!order.userId.equals(userId)) {
      throw new ForbiddenException('Access denied.');
    }

    this.assertCancellable(order.status);

    order.status = OrderStatus.CANCELLED;
    await order.save();

    this.logger.log(`Order ${orderId} cancelled by customer ${userId.toString()}`);
    return order;
  }

  async updateShippingAddress(
    orderId: string,
    userId: Types.ObjectId,
    dto: UpdateShippingAddressDto,
  ): Promise<Order> {
    const order = await this.orderModel.findOne({ orderId });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }

    if (!order.userId.equals(userId)) {
      throw new ForbiddenException('Access denied.');
    }

    if (NON_EDITABLE_ADDRESS_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `Shipping address cannot be changed once the order is "${order.status}".`,
      );
    }

    order.shippingAddress = dto;
    await order.save();

    this.logger.log(`Shipping address updated for order ${orderId} by user ${userId.toString()}`);
    return order;
  }

  // ─── Admin (used by GraphQL resolver) ─────────────────────────────────────

  async findAll(limit = 20, offset = 0): Promise<Order[]> {
    return this.orderModel.find().sort({ createdAt: -1 }).skip(offset).limit(limit).lean();
  }

  async findByUserEmail(email: string): Promise<Order[]> {
    return this.orderModel
      .find({ 'user.email': email.toLowerCase() })
      .sort({ createdAt: -1 })
      .lean();
  }

  async adminCancelOrder(orderId: string): Promise<Order> {
    const order = await this.orderModel.findOne({ orderId });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }

    this.assertCancellable(order.status);

    order.status = OrderStatus.CANCELLED;
    await order.save();

    this.logger.log(`Order ${orderId} cancelled by admin`);
    return order;
  }

  async updatePaymentStatus(
    orderId: string,
    status: PaymentStatus,
    stripePaymentIntentId?: string,
  ): Promise<void> {
    const order = await this.orderModel.findOne({ orderId });

    if (!order) {
      this.logger.warn(`updatePaymentStatus: order ${orderId} not found`);
      return;
    }

    order.payment.status = status;
    if (stripePaymentIntentId) {
      order.payment.stripePaymentIntentId = stripePaymentIntentId;
    }

    await order.save();
    this.logger.log(`Order ${orderId} payment status updated to ${status}`);
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private assertCancellable(status: OrderStatus): void {
    if (NON_CANCELLABLE_STATUSES.includes(status)) {
      throw new BadRequestException(`Order with status "${status}" can no longer be cancelled.`);
    }
  }

  private generateOrderId(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `ORD-${date}-${suffix}`;
  }
}
