import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as ExcelJS from 'exceljs';
import { Model } from 'mongoose';

import { Order, OrderDocument } from '@/orders/entities/order.schema';
import { Product, ProductDocument } from '@/products/entities/product.schema';

@Injectable()
export class ExportService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  async exportProductsToExcel(): Promise<Buffer> {
    const products = await this.productModel.find().lean();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Products');

    sheet.columns = [
      { header: 'ID', key: '_id', width: 26 },
      { header: 'Code', key: 'productCode', width: 12 },
      { header: 'Title', key: 'title', width: 32 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Price', key: 'price', width: 12 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Image URL', key: 'imageUrl', width: 40 },
      { header: 'Created At', key: 'createdAt', width: 22 },
      { header: 'Updated At', key: 'updatedAt', width: 22 },
    ];

    sheet.getRow(1).font = { bold: true };

    for (const p of products) {
      sheet.addRow({
        _id: String(p._id),
        productCode: p.productCode,
        title: p.title,
        status: p.status,
        price: p.price,
        description: p.description ?? '',
        imageUrl: p.imageUrl ?? '',
        createdAt: (p as ProductDocument & { createdAt?: Date }).createdAt?.toISOString() ?? '',
        updatedAt: (p as ProductDocument & { updatedAt?: Date }).updatedAt?.toISOString() ?? '',
      });
    }

    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  async exportOrdersToExcel(): Promise<Buffer> {
    const orders = await this.orderModel.find().lean();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Orders');

    sheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 22 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Customer Name', key: 'customerName', width: 24 },
      { header: 'Customer Email', key: 'customerEmail', width: 30 },
      { header: 'Customer Phone', key: 'customerPhone', width: 18 },
      { header: 'City', key: 'city', width: 18 },
      { header: 'Branch', key: 'branchNumber', width: 10 },
      { header: 'Carrier', key: 'carrier', width: 14 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Total Price', key: 'totalPrice', width: 12 },
      { header: 'Items Count', key: 'itemsCount', width: 14 },
      { header: 'Created At', key: 'createdAt', width: 22 },
    ];

    sheet.getRow(1).font = { bold: true };

    for (const o of orders) {
      sheet.addRow({
        orderId: o.orderId,
        status: o.status,
        customerName: `${o.user.firstName} ${o.user.lastName}`,
        customerEmail: o.user.email,
        customerPhone: o.user.phone,
        city: o.shippingAddress.city,
        branchNumber: o.shippingAddress.branchNumber,
        carrier: o.shippingAddress.carrier,
        amount: o.amount,
        totalPrice: o.totalPrice,
        itemsCount: o.items.length,
        createdAt: (o as OrderDocument & { createdAt?: Date }).createdAt?.toISOString() ?? '',
      });
    }

    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }
}
