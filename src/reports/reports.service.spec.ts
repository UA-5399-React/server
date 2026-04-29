import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';

import { Order } from '@/orders/entities';
import { GetAbcAnalysisStatisticsArgs } from '@/reports/args/get-abc-analysis-statistics.args';
import { GetSalesStatisticsArgs } from '@/reports/args/get-sales-statistics.args';
import { AbcMetricEnum } from '@/reports/enums/abc-metric.enum';
import { ReportsService } from '@/reports/reports.service';

describe('ReportsService', () => {
  let service: ReportsService;

  const execMock = jest.fn();
  const aggregateMock = jest.fn();

  const orderModelMock = {
    aggregate: aggregateMock,
  };

  const createSalesArgs = (): GetSalesStatisticsArgs =>
    Object.assign(new GetSalesStatisticsArgs(), {
      dateFrom: new Date('2026-01-01T00:00:00.000Z'),
      dateTo: new Date('2026-01-31T23:59:59.999Z'),
    });

  const createAbcArgs = (
    overrides: Partial<GetAbcAnalysisStatisticsArgs> = {},
  ): GetAbcAnalysisStatisticsArgs =>
    Object.assign(new GetAbcAnalysisStatisticsArgs(), {
      dateFrom: new Date('2026-01-01T00:00:00.000Z'),
      dateTo: new Date('2026-01-31T23:59:59.999Z'),
      metric: AbcMetricEnum.REVENUE,
      aThreshold: 80,
      bThreshold: 95,
      ...overrides,
    });

  beforeEach(async () => {
    aggregateMock.mockReturnValue({ exec: execMock });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getModelToken(Order.name),
          useValue: orderModelMock,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSalesGroupedByProduct', () => {
    it('should return grouped sales by product', async () => {
      const args = createSalesArgs();
      const aggregatedItems = [
        {
          productName: 'Product A',
          productCode: '000001',
          unitsSold: 10,
          revenue: 1200,
        },
      ];

      execMock.mockResolvedValue(aggregatedItems);

      const result = await service.getSalesGroupedByProduct(args);

      expect(aggregateMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        items: aggregatedItems,
        summary: {
          totalRevenue: 1200,
          totalUnitsSold: 10,
        },
      });
    });
  });

  describe('getSalesGroupedByCategory', () => {
    it('should return grouped sales by category', async () => {
      const args = createSalesArgs();
      const aggregatedItems = [
        {
          category: 'Category A',
          unitsSold: 8,
          revenue: 900,
        },
      ];

      execMock.mockResolvedValue(aggregatedItems);

      const result = await service.getSalesGroupedByCategory(args);

      expect(aggregateMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        items: aggregatedItems,
        summary: {
          totalRevenue: 900,
          totalUnitsSold: 8,
        },
      });
    });
  });

  describe('getSalesGroupedByDay', () => {
    it('should return grouped sales by day', async () => {
      const args = createSalesArgs();
      const aggregatedItems = [
        {
          date: '2026-01-10',
          unitsSold: 7,
          revenue: 500,
          ordersCount: 3,
          averageCheck: 166.67,
        },
      ];

      execMock.mockResolvedValue(aggregatedItems);

      const result = await service.getSalesGroupedByDay(args);

      expect(aggregateMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        items: aggregatedItems,
        summary: {
          totalRevenue: 500,
          totalUnitsSold: 7,
          totalOrdersCount: 3,
          averageCheck: 166.67,
        },
      });
    });
  });

  describe('getAbcAnalysis', () => {
    it('should return abc analysis response', async () => {
      const args = createAbcArgs();

      const aggregatedItems = [
        {
          productName: 'Product A',
          value: 1000,
          cumulativeValue: 1000,
          totalValue: 2000,
          cumulativePercentage: 50,
          percentageByTotal: 50,
          bucket: 'A',
        },
        {
          productName: 'Product B',
          value: 700,
          cumulativeValue: 1700,
          totalValue: 2000,
          cumulativePercentage: 85,
          percentageByTotal: 35,
          bucket: 'B',
        },
        {
          productName: 'Product C',
          value: 300,
          cumulativeValue: 2000,
          totalValue: 2000,
          cumulativePercentage: 100,
          percentageByTotal: 15,
          bucket: 'C',
        },
      ];

      execMock.mockResolvedValue(aggregatedItems);

      const result = await service.getAbcAnalysis(args);

      expect(aggregateMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        items: aggregatedItems,
        total: 3,
        page: 1,
        limit: 10,
        summary: {
          metric: AbcMetricEnum.REVENUE,
          totalValue: 2000,
          aCount: 1,
          bCount: 1,
          cCount: 1,
        },
      });
    });

    it('should return empty abc analysis response when no items found', async () => {
      const args = createAbcArgs();

      execMock.mockResolvedValue([]);

      const result = await service.getAbcAnalysis(args);

      expect(result).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        summary: {
          metric: AbcMetricEnum.REVENUE,
          totalValue: 0,
          aCount: 0,
          bCount: 0,
          cCount: 0,
        },
      });
    });

    it('should throw when aThreshold is greater than or equal to bThreshold', async () => {
      const args = createAbcArgs({
        aThreshold: 90,
        bThreshold: 80,
      });

      await expect(service.getAbcAnalysis(args)).rejects.toThrow(BadRequestException);
      expect(aggregateMock).not.toHaveBeenCalled();
    });

    it('should throw when aThreshold is less than or equal to zero', async () => {
      const args = createAbcArgs({
        aThreshold: 0,
      });

      await expect(service.getAbcAnalysis(args)).rejects.toThrow(BadRequestException);
      expect(aggregateMock).not.toHaveBeenCalled();
    });

    it('should throw when bThreshold is greater than 100', async () => {
      const args = createAbcArgs({
        bThreshold: 101,
      });

      await expect(service.getAbcAnalysis(args)).rejects.toThrow(BadRequestException);
      expect(aggregateMock).not.toHaveBeenCalled();
    });

    it('should return summary with units metric', async () => {
      const args = createAbcArgs({
        metric: AbcMetricEnum.UNITS,
      });

      const aggregatedItems = [
        {
          productName: 'Product A',
          value: 12,
          cumulativeValue: 12,
          totalValue: 20,
          cumulativePercentage: 60,
          percentageByTotal: 60,
          bucket: 'A',
        },
        {
          productName: 'Product B',
          value: 8,
          cumulativeValue: 20,
          totalValue: 20,
          cumulativePercentage: 100,
          percentageByTotal: 40,
          bucket: 'C',
        },
      ];

      execMock.mockResolvedValue(aggregatedItems);

      const result = await service.getAbcAnalysis(args);

      expect(result).toEqual({
        items: aggregatedItems,
        total: 2,
        page: 1,
        limit: 10,
        summary: {
          metric: AbcMetricEnum.UNITS,
          totalValue: 20,
          aCount: 1,
          bCount: 0,
          cCount: 1,
        },
      });
    });
  });
});
