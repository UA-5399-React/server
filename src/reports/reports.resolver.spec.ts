import { Test, TestingModule } from '@nestjs/testing';

import { GetAbcAnalysisStatisticsArgs } from '@/reports/args/get-abc-analysis-statistics.args';
import { GetSalesStatisticsArgs } from '@/reports/args/get-sales-statistics.args';
import { AbcMetricEnum } from '@/reports/enums/abc-metric.enum';
import { ReportsResolver } from '@/reports/reports.resolver';
import { ReportsService } from '@/reports/reports.service';
import { AbcAnalysisResponse } from '@/reports/types/abc-analysis-response.type';
import { GroupedByCategory } from '@/reports/types/grouped-by-category.type';
import { GroupedByDay } from '@/reports/types/grouped-by-day.type';
import { GroupedByProduct } from '@/reports/types/grouped-by-products.type';

describe('ReportsResolver', () => {
  let resolver: ReportsResolver;
  let reportsService: jest.Mocked<ReportsService>;

  const reportsServiceMock = {
    getSalesGroupedByProduct: jest.fn(),
    getSalesGroupedByCategory: jest.fn(),
    getSalesGroupedByDay: jest.fn(),
    getAbcAnalysis: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsResolver,
        {
          provide: ReportsService,
          useValue: reportsServiceMock,
        },
      ],
    }).compile();

    resolver = module.get<ReportsResolver>(ReportsResolver);
    reportsService = module.get(ReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('getSalesByProduct', () => {
    it('should return grouped sales by product', async () => {
      const args: GetSalesStatisticsArgs = {
        dateFrom: new Date('2026-01-01T00:00:00.000Z'),
        dateTo: new Date('2026-01-31T23:59:59.999Z'),
      };

      const serviceResult: GroupedByProduct[] = [
        {
          productName: 'Product A',
          unitsSold: 10,
          revenue: 1200,
        },
      ];
      const spy = jest
        .spyOn(reportsService, 'getSalesGroupedByProduct')
        .mockResolvedValue(serviceResult);

      reportsService.getSalesGroupedByProduct.mockResolvedValue(serviceResult);

      const result = await resolver.getSalesByProduct(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(serviceResult);
    });
  });

  describe('getSalesByCategory', () => {
    it('should return grouped sales by category', async () => {
      const args: GetSalesStatisticsArgs = {
        dateFrom: new Date('2026-01-01T00:00:00.000Z'),
        dateTo: new Date('2026-01-31T23:59:59.999Z'),
      };

      const serviceResult: GroupedByCategory[] = [
        {
          category: 'Trousers',
          unitsSold: 5,
          revenue: 900,
        },
      ];
      const spy = jest
        .spyOn(reportsService, 'getSalesGroupedByCategory')
        .mockResolvedValue(serviceResult);

      reportsService.getSalesGroupedByCategory.mockResolvedValue(serviceResult);

      const result = await resolver.getSalesByCategory(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(serviceResult);
    });
  });

  describe('getSalesByDay', () => {
    it('should return grouped sales by day', async () => {
      const args: GetSalesStatisticsArgs = {
        dateFrom: new Date('2026-01-01T00:00:00.000Z'),
        dateTo: new Date('2026-01-31T23:59:59.999Z'),
      };

      const serviceResult: GroupedByDay[] = [
        {
          date: '2026-01-10',
          unitsSold: 7,
          revenue: 500,
          ordersCount: 3,
          averageCheck: 166.67,
        },
      ];
      const spy = jest
        .spyOn(reportsService, 'getSalesGroupedByDay')
        .mockResolvedValue(serviceResult);

      reportsService.getSalesGroupedByDay.mockResolvedValue(serviceResult);

      const result = await resolver.getSalesByDay(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(serviceResult);
    });
  });

  describe('getAbcAnalysis', () => {
    it('should return abc analysis', async () => {
      const args: GetAbcAnalysisStatisticsArgs = {
        dateFrom: new Date('2026-01-01T00:00:00.000Z'),
        dateTo: new Date('2026-01-31T23:59:59.999Z'),
        metric: AbcMetricEnum.REVENUE,
        aThreshold: 80,
        bThreshold: 95,
      };

      const serviceResult: AbcAnalysisResponse = {
        items: [
          {
            productName: 'Product A',
            value: 1000,
            cumulativeValue: 1000,
            totalValue: 2000,
            cumulativePercentage: 50,
            percentageByTotal: 50,
            bucket: 'A',
          },
        ],
        summary: {
          metric: AbcMetricEnum.REVENUE,
          totalValue: 2000,
          aCount: 1,
          bCount: 0,
          cCount: 0,
        },
      };
      const spy = jest.spyOn(reportsService, 'getAbcAnalysis').mockResolvedValue(serviceResult);

      reportsService.getAbcAnalysis.mockResolvedValue(serviceResult);

      const result = await resolver.getAbcAnalysis(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(serviceResult);
    });
  });
});
