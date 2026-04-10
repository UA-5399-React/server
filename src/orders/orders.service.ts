import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as path from 'path';
import PdfTable from 'pdfkit-table';

import { SortOrder } from '@/common/enums/sort-order.enum';
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
import { GetOrdersQueryDto } from './dto/get-orders-query.dto';
import { UpdateShippingAddressDto } from './dto/update-shipping-address.dto';
import { Order, OrderDocument } from './entities';
import { PaymentStatus } from './enums/payment-status.enum';
import { UpdateOrderInput } from './graphql/inputs/update-order.input';
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

  async create(dto: CreateOrderDto, userId: Types.ObjectId, status?: OrderStatus): Promise<Order> {
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
      status: status ?? OrderStatus.NEW,
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

    if (order.userId.toString() !== userId.toString()) {
      throw new ForbiddenException('Access denied.');
    }

    return order;
  }

  async cancelMyOrder(orderId: string, userId: Types.ObjectId): Promise<Order> {
    const order = await this.orderModel.findOne({ orderId });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }

    if (order.userId.toString() !== userId.toString()) {
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

    if (order.userId.toString() !== userId.toString()) {
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

  async findAllFiltered(query: GetOrdersQueryDto): Promise<Order[]> {
    const filter = this.buildRestOrdersFilter(query);

    return this.orderModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async findAll(limit = 20, offset = 0): Promise<Order[]> {
    return this.orderModel.find().sort({ createdAt: -1 }).skip(offset).limit(limit).lean();
  }

  async findByUserEmail(email: string): Promise<Order[]> {
    return this.orderModel
      .find({ 'user.email': email.toLowerCase() })
      .sort({ createdAt: -1 })
      .lean();
  }

  async findProductsInOrders(productId: string) {
    const orders = await this.orderModel.find({ 'items.product': new Types.ObjectId(productId) });

    const result = orders.reduce(
      (acc, order) => {
        const isActive = this.isActiveOrder(order.status);

        const matchingItems = order.items.filter((item) => item.product.toString() === productId);

        for (const item of matchingItems) {
          acc.totalOrders += 1;
          acc.totalAmount += item.amount;

          if (isActive) {
            acc.activeOrders += 1;
            acc.activeAmount += item.amount;
          }
        }

        return acc;
      },
      { totalOrders: 0, totalAmount: 0, activeOrders: 0, activeAmount: 0 },
    );

    return { productId, ...result };
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
    const order = await this.orderModel.findOne({ orderId });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const wasUpdated = this.applyOrderStatusUpdate(order, status, role);
    if (!wasUpdated) {
      return order;
    }

    await order.save();

    if (wasUpdated && order.user?.email) {
      this.mailService
        .sendOrderStatusEmail(order.user.email, order.orderId, order.status)
        .catch((err) => console.error('Failed to send email', err));
    }
    return order;
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

  async updateOrderItems(input: UpdateOrderProductsInput, role: Role): Promise<OrderType> {
    return this.updateOrder(
      {
        orderId: input.orderId,
        items: input.items,
      },
      role,
    );
  }

  async updateOrderUserInfo(input: UpdateOrderUserInput, role: Role): Promise<OrderType> {
    return this.updateOrder(
      {
        orderId: input.orderId,
        user: input.user,
      },
      role,
    );
  }

  async updateOrderShippingAddress(
    input: UpdateOrderShippingAddressInput,
    role: Role,
  ): Promise<OrderType> {
    return this.updateOrder(
      {
        orderId: input.orderId,
        shippingAddress: input.shippingAddress,
      },
      role,
    );
  }

  async updateOrder(input: UpdateOrderInput, role: Role): Promise<OrderType> {
    const order = await this.orderModel.findOne({ orderId: input.orderId });
    if (!order) throw new NotFoundException('Order not found');

    const hasChanges =
      input.status !== undefined ||
      input.items !== undefined ||
      input.user !== undefined ||
      input.shippingAddress !== undefined;

    if (!hasChanges) {
      throw new BadRequestException(
        'At least one update field is required: status, items, user, or shippingAddress.',
      );
    }

    let statusWasUpdated = false;
    if (input.status !== undefined) {
      statusWasUpdated = this.applyOrderStatusUpdate(order, input.status, role);
    }

    if (input.items !== undefined) {
      await this.applyOrderItemsUpdate(order, {
        orderId: input.orderId,
        items: input.items,
      });
    }

    if (input.user !== undefined) {
      this.applyOrderUserInfoUpdate(order, {
        orderId: input.orderId,
        user: input.user,
      });
    }

    if (input.shippingAddress !== undefined) {
      this.applyOrderShippingAddressUpdate(order, {
        orderId: input.orderId,
        shippingAddress: input.shippingAddress,
      });
    }

    await order.save();

    if (statusWasUpdated && order.user?.email) {
      this.mailService
        .sendOrderStatusEmail(order.user.email, order.orderId, order.status)
        .catch((err) => console.error('Failed to send email', err));
    }

    return this.mapOrderDocumentToGraphQL(order);
  }

  async remove(orderId: string): Promise<void> {
    const deleted = await this.orderModel.findOneAndDelete({ orderId }).exec();

    if (!deleted) {
      throw new NotFoundException('Order not found');
    }
  }
  // ─── Private ───────────────────────────────────────────────────────────────

  private assertCancellable(status: OrderStatus): void {
    if (NON_CANCELLABLE_STATUSES.includes(status)) {
      throw new BadRequestException(`Order with status "${status}" can no longer be cancelled.`);
    }
  }

  private async applyOrderItemsUpdate(
    order: OrderDocument,
    input: UpdateOrderProductsInput,
  ): Promise<void> {
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
  }

  private applyOrderUserInfoUpdate(order: OrderDocument, input: UpdateOrderUserInput): void {
    order.user = {
      ...order.user,
      ...Object.fromEntries(Object.entries(input.user).filter(([, v]) => v !== undefined)),
    };
  }

  private applyOrderShippingAddressUpdate(
    order: OrderDocument,
    input: UpdateOrderShippingAddressInput,
  ): void {
    order.shippingAddress = {
      ...order.shippingAddress,
      ...Object.fromEntries(
        Object.entries(input.shippingAddress).filter(([, v]) => v !== undefined),
      ),
    };
  }

  private applyOrderStatusUpdate(
    order: OrderDocument,
    nextStatus: OrderStatus,
    role: Role,
  ): boolean {
    this.assertStatusTransitionAllowed(order.status, nextStatus, role);

    if (order.status === nextStatus) {
      return false;
    }

    order.status = nextStatus;
    return true;
  }

  private assertStatusTransitionAllowed(
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
    role: Role,
  ): void {
    if (role === Role.SUPER_ADMIN) {
      return;
    }

    const allowed = ADMIN_ALLOWED_FLOW[currentStatus] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(
        `Transition from '${currentStatus}' to '${nextStatus}' is not allowed`,
      );
    }
  }

  private mapOrderDocumentToGraphQL(order: OrderDocument): OrderType {
    const orderObj = order.toObject();
    return {
      ...orderObj,
      id: orderObj._id.toString(),
    } as unknown as OrderType;
  }

  private buildRestOrdersFilter(query: GetOrdersQueryDto): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (query.status) {
      filter.status = query.status;
    }

    const normalizedSearch = query.search?.trim();

    if (normalizedSearch) {
      filter.$or = [
        { orderId: { $regex: normalizedSearch, $options: 'i' } },
        { 'user.email': { $regex: normalizedSearch, $options: 'i' } },
      ];
    }

    return filter;
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
    const sort = this.buildOrdersSort(args.sort, args.order);

    const [items, total] = await Promise.all([
      this.orderModel.find(filter).sort(sort).skip(skip).limit(limit).lean().exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  private buildOrdersSort(
    sortField: OrdersSortField | undefined,
    order: SortOrder | undefined,
  ): Record<string, 1 | -1> {
    const direction = order === SortOrder.asc ? 1 : -1;

    if (sortField === OrdersSortField.customerName) {
      return { 'user.firstName': direction, 'user.lastName': direction };
    }

    return buildSort(sortField, order, OrdersSortField.createdAt);
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

  private isActiveOrder(status: OrderStatus): boolean {
    return [OrderStatus.PROCESSING, OrderStatus.SHIPPING, OrderStatus.NEW].includes(status);
  }

  async generateOrderPdf(orderId: string): Promise<Buffer> {
    const order = await this.findOrderById(orderId);
    const fontPath = path.join(__dirname, '..', 'assets', 'fonts', 'DejaVuSans.ttf');
    const fontBoldPath = path.join(__dirname, '..', 'assets', 'fonts', 'DejaVuSans-Bold.ttf');

    return new Promise((resolve, reject) => {
      const doc = new PdfTable({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));

      doc.registerFont('DejaVu', fontPath);
      doc.registerFont('DejaVu-Bold', fontBoldPath);

      const L = 50;
      const W = doc.page.width - 100;

      doc.rect(0, 0, doc.page.width, 90).fill('#1a1a2e');
      doc
        .font('DejaVu-Bold')
        .fontSize(20)
        .fillColor('#ffffff')
        .text(`Order ${order.orderId}`, L, 22, { width: W, align: 'center' });
      doc
        .font('DejaVu')
        .fontSize(10)
        .fillColor('#9999bb')
        .text(new Date(order.createdAt).toLocaleString('uk'), L, 54, { width: W, align: 'center' });
      doc.moveDown(3).fillColor('#000000');

      const sectionTitle = (title: string) => {
        doc.moveDown(0.8);
        doc.font('DejaVu-Bold').fontSize(11).fillColor('#1a1a2e').text(title, L);
        doc
          .moveTo(L, doc.y + 2)
          .lineTo(L + W, doc.y + 2)
          .lineWidth(0.8)
          .strokeColor('#1a1a2e')
          .stroke();
        doc.moveDown(0.6);
        doc.font('DejaVu').fontSize(10).fillColor('#333333');
      };

      const field = (label: string, value: string, valueColor = '#111111') => {
        const y = doc.y;
        doc.font('DejaVu-Bold').fontSize(10).fillColor('#666666').text(label, L, y, { width: 130 });
        doc
          .font('DejaVu')
          .fontSize(10)
          .fillColor(valueColor)
          .text(value, L + 130, y);
      };

      sectionTitle('Customer');
      const user = order.user;
      if (user) {
        field('Name:', `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim());
        if (user.email) field('Email:', user.email);
        if (user.phone) field('Phone:', user.phone);
      }

      sectionTitle('Delivery');
      const address = order.shippingAddress;
      if (address) {
        field('Carrier:', address.carrier);
        field('City:', address.city);
        field('Branch:', `#${address.branchNumber}`);
      }

      sectionTitle('Order Info');
      const statusColors: Record<string, string> = {
        new: '#2563eb',
        processing: '#d97706',
        completed: '#16a34a',
        cancelled: '#dc2626',
      };
      field('Status:', order.status.toUpperCase(), statusColors[order.status] ?? '#333333');
      if (order.payment) {
        field('Payment method:', order.payment.method);
        field('Payment status:', order.payment.status);
      }

      sectionTitle('Items');

      doc
        .table(
          {
            headers: [
              { label: 'Product', property: 'title', width: 240 },
              { label: 'Qty', property: 'qty', width: 50, align: 'center' },
              { label: 'Unit price', property: 'unitPrice', width: 100, align: 'right' },
              { label: 'Total', property: 'total', width: 100, align: 'right' },
            ],
            datas: order.items.map((item) => ({
              title: item.title,
              qty: String(item.amount),
              unitPrice: `$${item.unitPrice.toFixed(2)}`,
              total: `$${(item.unitPrice * item.amount).toFixed(2)}`,
            })),
          },
          {
            x: L,
            y: doc.y,
            prepareHeader: () => doc.font('DejaVu-Bold').fontSize(11),
            prepareRow: () => doc.font('DejaVu').fontSize(11),
          },
        )
        .then(() => doc.end())
        .catch((err: Error) => reject(err));

      if (order.message) {
        sectionTitle('Note');
        doc.font('DejaVu').fontSize(10).fillColor('#444444').text(order.message);
      }

      doc.moveDown();
      const totalY = doc.y;
      const totalBlockH = order.amount !== order.totalPrice ? 56 : 34;
      doc.rect(L, totalY, W, totalBlockH).fill('#1a1a2e');

      if (order.amount !== order.totalPrice) {
        doc
          .font('DejaVu')
          .fontSize(10)
          .fillColor('#9999bb')
          .text(`Subtotal: $${order.amount.toFixed(2)}`, L, totalY + 8, {
            width: W - 12,
            align: 'right',
          });
        doc.text(`Discount: -$${(order.amount - order.totalPrice).toFixed(2)}`, L, totalY + 24, {
          width: W - 12,
          align: 'right',
        });
        doc
          .font('DejaVu-Bold')
          .fontSize(13)
          .fillColor('#ffffff')
          .text(`TOTAL: $${order.totalPrice.toFixed(2)}`, L, totalY + 40, {
            width: W - 12,
            align: 'right',
          });
      } else {
        doc
          .font('DejaVu-Bold')
          .fontSize(13)
          .fillColor('#ffffff')
          .text(`TOTAL: $${order.totalPrice.toFixed(2)}`, L, totalY + 10, {
            width: W - 12,
            align: 'right',
          });
      }
    });
  }
}
