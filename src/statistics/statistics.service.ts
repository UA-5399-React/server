import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Order, OrderDocument } from '@/orders/entities';
import { OrderStatus } from '@/orders/enums';

import { SalesDynamicsArgs } from './args/sales-dynamics.args';
import { GroupBy } from './enums/group-by.enum';
import { SalesDynamicsPoint } from './types/sales-dynamics-point.type';

@Injectable()
export class StatisticsService {
  constructor(@InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>) {}

  async getSalesDynamics(args: SalesDynamicsArgs): Promise<SalesDynamicsPoint[]> {
    const { productIds, from, to, groupBy } = args;

    if (!productIds.length) return [];

    const productObjectIds = productIds.map((id) => new Types.ObjectId(id));

    const dateGroupExpr = this.buildDateGroupExpr(groupBy);

    const results = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lte: to },
          status: {
            $in: [OrderStatus.COMPLETED],
          },
        },
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.product': { $in: productObjectIds },
        },
      },
      {
        $group: {
          _id: {
            date: dateGroupExpr,
            productId: '$items.product',
          },
          value: { $sum: '$items.amount' },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id.date',
          productId: { $toString: '$_id.productId' },
          value: 1,
        },
      },
      { $sort: { date: 1, productId: 1 } },
    ]);

    const allDates = this.generateDateBuckets(from, to, groupBy);
    return this.fillMissingPoints(results, productIds, allDates);
  }

  private buildDateGroupExpr(groupBy: GroupBy): Record<string, unknown> {
    switch (groupBy) {
      case GroupBy.DAY:
        return {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        };

      case GroupBy.WEEK:
        return {
          $concat: [
            { $toString: { $isoWeekYear: '$createdAt' } },
            '-W',
            {
              $cond: [
                { $lt: [{ $isoWeek: '$createdAt' }, 10] },
                { $concat: ['0', { $toString: { $isoWeek: '$createdAt' } }] },
                { $toString: { $isoWeek: '$createdAt' } },
              ],
            },
          ],
        };

      case GroupBy.MONTH:
        return {
          $dateToString: { format: '%Y-%m', date: '$createdAt' },
        };

      default:
        throw new Error(`Unhandled GroupBy value: ${groupBy as string}`);
    }
  }

  private generateDateBuckets(from: Date, to: Date, groupBy: GroupBy): string[] {
    const buckets: string[] = [];
    const cursor = new Date(from);

    while (cursor <= to) {
      buckets.push(this.formatDateBucket(cursor, groupBy));

      switch (groupBy) {
        case GroupBy.DAY:
          cursor.setUTCDate(cursor.getUTCDate() + 1);
          break;
        case GroupBy.WEEK:
          cursor.setUTCDate(cursor.getUTCDate() + 7);
          break;
        case GroupBy.MONTH:
          cursor.setUTCMonth(cursor.getUTCMonth() + 1);
          break;
      }
    }

    return [...new Set(buckets)];
  }

  private formatDateBucket(date: Date, groupBy: GroupBy): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');

    switch (groupBy) {
      case GroupBy.DAY:
        return `${y}-${m}-${d}`;

      case GroupBy.WEEK: {
        const week = this.getISOWeek(date);
        const weekYear = this.getISOWeekYear(date);
        return `${weekYear}-W${String(week).padStart(2, '0')}`;
      }

      case GroupBy.MONTH:
        return `${y}-${m}`;

      default:
        throw new Error(`Unhandled GroupBy value: ${groupBy as string}`);
    }
  }

  private fillMissingPoints(
    results: SalesDynamicsPoint[],
    productIds: string[],
    allDates: string[],
  ): SalesDynamicsPoint[] {
    const resultMap = new Map<string, number>();
    for (const r of results) {
      resultMap.set(`${r.date}__${r.productId}`, r.value);
    }

    const filled: SalesDynamicsPoint[] = [];
    for (const date of allDates) {
      for (const productId of productIds) {
        filled.push({
          date,
          productId,
          value: resultMap.get(`${date}__${productId}`) ?? 0,
        });
      }
    }

    return filled;
  }

  private getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  }

  private getISOWeekYear(date: Date): number {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    return d.getUTCFullYear();
  }
}
