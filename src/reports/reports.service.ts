import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';

import { buildDateFilter } from '@/common/utils/date.utils';
import { Order, OrderDocument } from '@/orders/entities';
import { OrderStatus } from '@/orders/enums';
import { GetAbcAnalysisStatisticsArgs } from '@/reports/args/get-abc-analysis-statistics.args';
import { GetSalesStatisticsArgs } from '@/reports/args/get-sales-statistics.args';
import { AbcMetricEnum } from '@/reports/enums/abc-metric.enum';
import { AbcAnalysisType } from '@/reports/types/abc-analysis.type';
import { AbcAnalysisResponse } from '@/reports/types/abc-analysis-response.type';
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

  async getAbcAnalysis(query: GetAbcAnalysisStatisticsArgs): Promise<AbcAnalysisResponse> {
    const matchStage = this.buildMatchStage(query);

    const aThreshold = query.aThreshold ?? 80;
    const bThreshold = query.bThreshold ?? 95;

    this.validateAbcThresholds(aThreshold, bThreshold);
    const metricFieldName = query.metric === AbcMetricEnum.REVENUE ? 'revenue' : 'unitsSold';
    const metricExpression =
      query.metric === AbcMetricEnum.REVENUE
        ? {
            $sum: {
              $multiply: ['$items.amount', '$items.unitPrice'],
            },
          }
        : {
            $sum: '$items.amount',
          };

    const items = await this.orderModel
      .aggregate<AbcAnalysisType>([
        { $match: matchStage },
        { $unwind: '$items' },
        ...this.buildCategoryFilterStages(query.categoryId),
        {
          $group: {
            _id: '$items.product',
            productName: { $first: '$items.title' },
            [metricFieldName]: metricExpression,
          },
        },

        {
          $sort: {
            [metricFieldName]: -1,
          },
        },
        {
          $setWindowFields: {
            sortBy: { [metricFieldName]: -1 },
            output: {
              cumulativeValue: {
                $sum: `$${metricFieldName}`,
                window: {
                  documents: ['unbounded', 'current'],
                },
              },
              totalValue: {
                $sum: `$${metricFieldName}`,
                window: {
                  documents: ['unbounded', 'unbounded'],
                },
              },
            },
          },
        },

        {
          $project: {
            _id: 0,
            productName: 1,
            value: { $round: [`$${metricFieldName}`, 2] },
            cumulativeValue: { $round: ['$cumulativeValue', 2] },
            totalValue: { $round: ['$totalValue', 2] },
            cumulativePercentage: {
              $round: [
                {
                  $multiply: [{ $divide: ['$cumulativeValue', '$totalValue'] }, 100],
                },
                2,
              ],
            },
            percentageByTotal: {
              $round: [
                {
                  $multiply: [{ $divide: [`$${metricFieldName}`, '$totalValue'] }, 100],
                },
                2,
              ],
            },
          },
        },
        {
          $addFields: {
            bucket: {
              $switch: {
                branches: [
                  {
                    case: { $lte: ['$cumulativePercentage', aThreshold] },
                    then: 'A',
                  },
                  {
                    case: { $lte: ['$cumulativePercentage', bThreshold] },
                    then: 'B',
                  },
                ],
                default: 'C',
              },
            },
          },
        },
      ])
      .exec();

    return {
      items,
      summary: {
        metric: query.metric,
        totalValue: items[0]?.totalValue ?? 0,
        aCount: items.filter((item) => item.bucket === 'A').length,
        bCount: items.filter((item) => item.bucket === 'B').length,
        cCount: items.filter((item) => item.bucket === 'C').length,
      },
    };
  }

  private validateAbcThresholds(aThreshold: number, bThreshold: number): void {
    if (aThreshold <= 0 || aThreshold >= 100) {
      throw new BadRequestException('aThreshold must be greater than 0 and less than 100');
    }

    if (bThreshold <= 0 || bThreshold > 100) {
      throw new BadRequestException(
        'bThreshold must be greater than 0 and less than or equal to 100',
      );
    }

    if (aThreshold >= bThreshold) {
      throw new BadRequestException('aThreshold must be less than bThreshold');
    }
  }
}
