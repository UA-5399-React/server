import { Test, TestingModule } from '@nestjs/testing';

import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { CityOption, WarehouseOption } from './types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockCities: CityOption[] = [
  { ref: 'city-ref-1', name: 'Київ', area: 'Київська' },
  { ref: 'city-ref-2', name: 'Львів', area: 'Львівська' },
];

const mockWarehouses: WarehouseOption[] = [
  {
    ref: 'warehouse-ref-1',
    number: '42',
    label: 'Відділення №42',
    fullAddress: 'Київ, вул. Хрещатик, 22',
    isPostMachine: false,
  },
  {
    ref: 'warehouse-ref-2',
    number: '5001',
    label: 'Поштомат №5001',
    fullAddress: 'Київ, вул. Велика Васильківська, 5',
    isPostMachine: true,
  },
];

// ─── Mock service ─────────────────────────────────────────────────────────────

const mockShippingService = {
  getCities: jest.fn(),
  getWarehouses: jest.fn(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ShippingController', () => {
  let controller: ShippingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShippingController],
      providers: [{ provide: ShippingService, useValue: mockShippingService }],
    }).compile();

    controller = module.get<ShippingController>(ShippingController);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── GET /shipping/cities ─────────────────────────────────────────────────

  describe('getCities', () => {
    it('should return a list of cities', async () => {
      mockShippingService.getCities.mockResolvedValue(mockCities);

      const result = await controller.getCities();

      expect(mockShippingService.getCities).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockCities);
    });

    it('should pass search param to the service', async () => {
      mockShippingService.getCities.mockResolvedValue([mockCities[0]]);

      const result = await controller.getCities('Київ');

      expect(mockShippingService.getCities).toHaveBeenCalledWith('Київ');
      expect(result).toEqual([mockCities[0]]);
    });

    it('should return an empty array when no cities match', async () => {
      mockShippingService.getCities.mockResolvedValue([]);

      const result = await controller.getCities('xyz');

      expect(result).toEqual([]);
    });
  });

  // ─── GET /shipping/warehouses ─────────────────────────────────────────────

  describe('getWarehouses', () => {
    it('should return a list of warehouses for a city', async () => {
      mockShippingService.getWarehouses.mockResolvedValue(mockWarehouses);

      const result = await controller.getWarehouses('Київ');

      expect(mockShippingService.getWarehouses).toHaveBeenCalledWith('Київ', undefined);
      expect(result).toEqual(mockWarehouses);
    });

    it('should pass search param to the service', async () => {
      mockShippingService.getWarehouses.mockResolvedValue([mockWarehouses[0]]);

      const result = await controller.getWarehouses('Київ', '42');

      expect(mockShippingService.getWarehouses).toHaveBeenCalledWith('Київ', '42');
      expect(result).toEqual([mockWarehouses[0]]);
    });

    it('should return an empty array when no warehouses match', async () => {
      mockShippingService.getWarehouses.mockResolvedValue([]);

      const result = await controller.getWarehouses('Київ', '9999');

      expect(result).toEqual([]);
    });
  });
});
