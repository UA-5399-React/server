import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { PaginatedResult } from '@/common/types/paginated-result.type';
import { buildDateFilter } from '@/common/utils/date.utils';
import { buildPaginatedResult, getPagination } from '@/common/utils/pagination.util';
import { buildSort } from '@/common/utils/sorting.util';
import { AppLogger } from '@/logger/app-logger.service';
import { MailService } from '@/mailer/mailer.service';
import { OrderStatus } from '@/orders/enums';
import { OrderDateFilterField } from '@/orders/enums/date-filter-field.enum';
import { OrdersSortField } from '@/orders/enums/orders-sort-field.enum';
import { FindOrdersQuery } from '@/orders/graphql/types/find-orders-query.type';
import { Product, ProductDocument } from '@/products/entities/product.schema';
import { ProductStatus } from '@/products/enums/product-status.enum';
import { Role } from '@/users/enums/role.enum';

import { ADMIN_ALLOWED_FLOW } from './constants/order-flow';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateShippingAddressDto } from './dto/update-shipping-address.dto';
import { Order, OrderDocument } from './entities';
import { PaymentStatus } from './enums/payment-status.enum';
import { UpdateOrderProductsInput } from './graphql/inputs/update-order-items.input';
import { UpdateOrderShippingAddressInput } from './graphql/inputs/update-order-shipping.input';
import { UpdateOrderUserInput } from './graphql/inputs/update-order-user.input';
import { OrderType } from './graphql/types/order.type';
import { OrderStatsType } from './graphql/types/order-stats.type';
import { NON_CANCELLABLE_STATUSES, NON_EDITABLE_ADDRESS_STATUSES } from './orders.constants';

@Injectable()
export class OrdersService {
  private readonly logger = new AppLogger();

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    private readonly mailService: MailService,
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

  async findOrderById(orderId: string): Promise<Order> {
    const order = await this.orderModel.findOne({ orderId }).lean();
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }
    return order;
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

  async updateOrderStatus(orderId: string, status: OrderStatus, role: Role): Promise<Order> {
    const order = await this.orderModel.findOne({ orderId }).lean();
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (role !== Role.SUPER_ADMIN) {
      const allowed = ADMIN_ALLOWED_FLOW[order.status] ?? [];
      if (!allowed.includes(status)) {
        throw new BadRequestException(
          `Transition from '${order.status}' to '${status}' is not allowed`,
        );
      }
    }

    const updated = await this.orderModel
      .findOneAndUpdate({ orderId }, { status }, { returnDocument: 'after' })
      .lean();

    if (updated?.user?.email) {
      this.mailService
        .sendOrderStatusEmail(updated.user.email, updated.orderId, status)
        .catch((err) => console.error('Failed to send email', err));
    }
    return updated!;
  }

  async getOrderStats(): Promise<OrderStatsType> {
    const results = await this.orderModel.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],

          byStatus: [
            { $match: { status: { $in: Object.values(OrderStatus) } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ],
        },
      },
    ]);

    const { total, byStatus } = results[0];

    const statusMap = Object.fromEntries(byStatus.map(({ _id, count }) => [_id, count]));

    return {
      totalOrders: total[0]?.count ?? 0,
      completedOrders: statusMap[OrderStatus.COMPLETED] ?? 0,
      newOrders: statusMap[OrderStatus.NEW] ?? 0,
      cancelledOrders: statusMap[OrderStatus.CANCELLED] ?? 0,
      processingOrders: statusMap[OrderStatus.PROCESSING] ?? 0,
      shippingOrders: statusMap[OrderStatus.SHIPPING] ?? 0,
    };
  }

  async updateOrderItems(input: UpdateOrderProductsInput): Promise<OrderType> {
    const order = await this.orderModel.findOne({ orderId: input.orderId });
    if (!order) throw new NotFoundException('Order not found');

    if (!input.items || input.items.length === 0) {
      throw new BadRequestException('Items array is required');
    }

    for (const itemInput of input.items ?? []) {
      const existingItem = order.items.find((i) => i.product.toString() === itemInput.productId);

      if (itemInput.remove) {
        order.items = order.items.filter((i) => i.product.toString() !== itemInput.productId);
        continue;
      }

      const product = await this.productModel.findById(itemInput.productId);
      if (!product) throw new NotFoundException('Product not found');

      if (existingItem) {
        if (itemInput.amount) existingItem.amount = itemInput.amount;
        existingItem.title = product.title;
        existingItem.imageUrl = product.imageUrl;
        existingItem.unitPrice = product.price;
      } else if (itemInput.amount) {
        order.items.push({
          product: product._id,
          title: product.title,
          imageUrl: product.imageUrl,
          unitPrice: product.price,
          amount: itemInput.amount,
        });
      }
    }

    order.totalPrice = order.items.reduce((sum, i) => sum + i.unitPrice * i.amount, 0);
    order.markModified('items');
    await order.save();

    const orderObj = order.toObject();
    return {
      ...orderObj,
      id: orderObj._id.toString(),
    } as unknown as OrderType;
  }

  async updateOrderUserInfo(input: UpdateOrderUserInput): Promise<OrderType> {
    const order = await this.orderModel.findOne({ orderId: input.orderId });
    if (!order) throw new NotFoundException('Order not found');

    order.user = {
      ...order.user,
      ...input.user,
    };

    await order.save();
    const orderObj = order.toObject();
    return {
      ...orderObj,
      id: orderObj._id.toString(),
    } as unknown as OrderType;
  }

  async updateOrderShippingAddress(input: UpdateOrderShippingAddressInput): Promise<OrderType> {
    const order = await this.orderModel.findOne({ orderId: input.orderId });
    if (!order) throw new NotFoundException('Order not found');

    order.shippingAddress = {
      ...order.shippingAddress,
      ...input.shippingAddress,
    };

    await order.save();
    const orderObj = order.toObject();
    return {
      ...orderObj,
      id: orderObj._id.toString(),
    } as unknown as OrderType;
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

  async findAllOrders(args: FindOrdersQuery): Promise<PaginatedResult<OrderDocument>> {
    const { page, limit, skip } = getPagination(args.page, args.limit);
    const f = args.filter;
    const filter = {
      ...this.buildSearchFilter(args.search),
      ...this.buildOrdersFilter(args),
      ...buildDateFilter(f?.dateFrom, f?.dateTo, f?.dateType, OrderDateFilterField.createdAt),
    };
    const sort = buildSort(args.sort, args.order, OrdersSortField.createdAt);

    const [items, total] = await Promise.all([
      this.orderModel.find(filter).sort(sort).skip(skip).limit(limit).lean().exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  private buildSearchFilter(search?: string): Record<string, unknown> {
    const normalizedSearch = search?.trim();

    if (!normalizedSearch) {
      return {};
    }

    return {
      $or: [
        { orderId: { $regex: normalizedSearch, $options: 'i' } },
        { 'user.email': { $regex: normalizedSearch, $options: 'i' } },
        { 'user.firstName': { $regex: normalizedSearch, $options: 'i' } },
        { 'user.lastName': { $regex: normalizedSearch, $options: 'i' } },
        { 'user.phone': { $regex: normalizedSearch, $options: 'i' } },
        { message: { $regex: normalizedSearch, $options: 'i' } },

        {
          $expr: {
            $regexMatch: {
              input: {
                $concat: [
                  { $ifNull: ['$user.firstName', ''] },
                  ' ',
                  { $ifNull: ['$user.lastName', ''] },
                ],
              },
              regex: normalizedSearch,
              options: 'i',
            },
          },
        },
      ],
    };
  }

  private buildOrdersFilter(args: FindOrdersQuery): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (args.filter?.status) {
      filter.status = args.filter.status;
    }

    if (args.filter?.paymentStatus) {
      filter.paymentStatus = args.filter.paymentStatus;
    }

    if (args.filter?.paymentMethod) {
      filter.paymentMethod = args.filter.paymentMethod;
    }

    if (args.filter?.carrier) {
      filter.carrier = args.filter.carrier;
    }

    return filter;
  }

  async findById(id: string): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid order id: "${id}"`);
    }

    const order = await this.orderModel.findById(id).lean();

    if (!order) {
      throw new NotFoundException(`Order ${order} not found.`);
    }

    return order;
  }
}
