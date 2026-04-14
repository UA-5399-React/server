import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';

import { buildDateFilter } from '@/common/utils/date.utils';
import { Order, OrderDocument } from '@/orders/entities';
import { OrderStatus } from '@/orders/enums';
import { GetSalesStatisticsArgs } from '@/reports/inputs/get-sales-statistics.args';
import { GroupedByCategory } from '@/reports/types/grouped-by-category.type';
import { GroupedByDay } from '@/reports/types/grouped-by-day.type';
import { GroupedByProduct } from '@/reports/types/grouped-by-products.type';

@Injectable()
export class ReportsService {
  constructor(@InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>) {}

  getSalesGroupedByProduct(query: GetSalesStatisticsArgs): Promise<GroupedByProduct[]> {
    const matchStage = this.buildMatchStage(query);

    return this.orderModel
      .aggregate<GroupedByProduct>([
        { $match: matchStage },
        { $unwind: '$items' },
        ...this.buildCategoryFilterStages(query.categoryId),
        {
          $group: {
            _id: '$items.product',
            productName: { $first: '$items.title' },
            unitsSold: {
              $sum: '$items.amount',
            },
            revenue: {
              $sum: {
                $multiply: ['$items.amount', '$items.unitPrice'],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            productName: 1,
            unitsSold: 1,
            revenue: { $round: ['$revenue', 2] },
          },
        },
        {
          $sort: {
            revenue: -1,
          },
        },
      ])
      .exec();
  }

  getSalesGroupedByDay(query: GetSalesStatisticsArgs): Promise<GroupedByDay[]> {
    const matchStage = this.buildMatchStage(query);

    return this.orderModel
      .aggregate<GroupedByDay>([
        { $match: matchStage },
        {
          $addFields: {
            day: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$updatedAt',
              },
            },
          },
        },

        { $unwind: '$items' },

        ...(query.categoryId ? this.buildCategoryFilterStages(query.categoryId) : []),

        {
          $facet: {
            sales: [
              {
                $group: {
                  _id: '$day',
                  unitsSold: {
                    $sum: '$items.amount',
                  },
                  revenue: {
                    $sum: {
                      $multiply: ['$items.amount', '$items.unitPrice'],
                    },
                  },
                },
              },
            ],

            orders: query.categoryId
              ? [
                  {
                    $group: {
                      _id: {
                        day: '$day',
                        orderId: '$_id',
                      },
                      totalPrice: { $first: '$totalPrice' },
                    },
                  },
                  {
                    $group: {
                      _id: '$_id.day',
                      ordersCount: { $sum: 1 },
                      averageCheck: { $avg: '$totalPrice' },
                    },
                  },
                ]
              : [
                  {
                    $group: {
                      _id: '$day',
                      ordersCount: { $sum: 1 },
                      averageCheck: { $avg: '$totalPrice' },
                    },
                  },
                ],
          },
        },
        {
          $project: {
            data: {
              $map: {
                input: '$sales',
                as: 'sale',
                in: {
                  date: '$$sale._id',
                  unitsSold: '$$sale.unitsSold',
                  revenue: { $round: ['$$sale.revenue', 2] },
                  ordersCount: {
                    $let: {
                      vars: {
                        order: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: '$orders',
                                as: 'o',
                                cond: { $eq: ['$$o._id', '$$sale._id'] },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: '$$order.ordersCount',
                    },
                  },
                  averageCheck: {
                    $let: {
                      vars: {
                        order: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: '$orders',
                                as: 'o',
                                cond: { $eq: ['$$o._id', '$$sale._id'] },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: { $round: ['$$order.averageCheck', 2] },
                    },
                  },
                },
              },
            },
          },
        },
        { $unwind: '$data' },
        { $replaceRoot: { newRoot: '$data' } },
        { $sort: { date: 1 } },
      ])
      .exec();
  }

  getSalesGroupedByCategory(query: GetSalesStatisticsArgs): Promise<GroupedByCategory[]> {
    const matchStage = this.buildMatchStage(query);

    return this.orderModel
      .aggregate<GroupedByCategory>([
        { $match: matchStage },
        { $unwind: '$items' },

        ...this.buildProductCategoriesStages(query.categoryId),

        {
          $lookup: {
            from: 'categories',
            localField: 'reportCategories',
            foreignField: '_id',
            as: 'categoryDoc',
          },
        },
        {
          $unwind: {
            path: '$categoryDoc',
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $addFields: {
            reportCategoryKey: {
              $ifNull: ['$categoryDoc._id', null],
            },
            reportCategoryTitle: {
              $ifNull: ['$categoryDoc.title', 'No category'],
            },
          },
        },

        {
          $group: {
            _id: {
              key: '$reportCategoryKey',
              title: '$reportCategoryTitle',
            },
            category: {
              $first: '$reportCategoryTitle',
            },
            unitsSold: {
              $sum: '$items.amount',
            },
            revenue: {
              $sum: {
                $multiply: ['$items.amount', '$items.unitPrice'],
              },
            },
          },
        },

        {
          $project: {
            _id: 0,
            category: 1,
            unitsSold: 1,
            revenue: { $round: ['$revenue', 2] },
          },
        },
        {
          $sort: {
            revenue: -1,
          },
        },
      ])
      .exec();
  }

  private buildMatchStage(query: GetSalesStatisticsArgs) {
    return {
      ...buildDateFilter(query?.dateFrom, query?.dateTo, 'updatedAt', 'updatedAt'),
      status: OrderStatus.COMPLETED,
    };
  }

  private buildCategoryFilterStages(categoryId?: string): PipelineStage[] {
    if (!categoryId) {
      return [];
    }

    const categoryObjectId = new Types.ObjectId(categoryId);

    return [
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $match: {
          'product.categories': categoryObjectId,
        },
      },
    ];
  }

  private buildProductCategoriesStages(categoryId?: string): PipelineStage[] {
    const stages: PipelineStage[] = [
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $unwind: {
          path: '$product',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          reportCategories: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$product.categories', []] } }, 0] },
              '$product.categories',
              [null],
            ],
          },
        },
      },
      { $unwind: '$reportCategories' },
    ];

    if (categoryId) {
      stages.push({
        $match: {
          reportCategories: new Types.ObjectId(categoryId),
        },
      });
    }

    return stages;
  }
}
