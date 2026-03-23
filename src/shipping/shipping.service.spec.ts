import { HttpService } from '@nestjs/axios';
import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';

import { NP_WAREHOUSE_TYPES } from './nova-poshta.constants';
import { ShippingService } from './shipping.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockNpCity = {
  Ref: 'city-ref-1',
  Description: 'Київ',
  AreaDescription: 'Київська',
  RegionsDescription: '',
};

const mockNpBranch = {
  Ref: 'warehouse-ref-1',
  Number: '42',
  Description: 'Відділення №42',
  ShortAddress: 'Київ, вул. Хрещатик, 22',
  TypeOfWarehouse: 'a9f93df5-5012-11ec-8ee1-005056b24375',
  CityDescription: 'Київ',
};

const mockNpPostMachine = {
  ...mockNpBranch,
  Ref: 'warehouse-ref-2',
  Number: '5001',
  Description: 'Поштомат №5001',
  TypeOfWarehouse: NP_WAREHOUSE_TYPES.POST_MACHINE,
};

function npSuccess<T>(data: T[]) {
  return of({ data: { success: true, data, errors: [] } });
}

function npFailure(errors: string[]) {
  return of({ data: { success: false, data: [], errors } });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ShippingService', () => {
  let service: ShippingService;
  let httpService: { post: jest.Mock };

  beforeEach(async () => {
    httpService = { post: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingService,
        { provide: HttpService, useValue: httpService },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('test-api-key') },
        },
      ],
    }).compile();

    service = module.get<ShippingService>(ShippingService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getCities ────────────────────────────────────────────────────────────

  describe('getCities', () => {
    it('should return mapped city options', async () => {
      httpService.post.mockReturnValue(npSuccess([mockNpCity]));

      const result = await service.getCities();

      expect(result).toEqual([{ ref: 'city-ref-1', name: 'Київ', area: 'Київська' }]);
    });

    it('should pass FindByString when search is provided', async () => {
      httpService.post.mockReturnValue(npSuccess([mockNpCity]));

      await service.getCities('Київ');

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          methodProperties: { FindByString: 'Київ' },
        }),
      );
    });

    it('should pass empty methodProperties when search is not provided', async () => {
      httpService.post.mockReturnValue(npSuccess([mockNpCity]));

      await service.getCities();

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ methodProperties: {} }),
      );
    });

    it('should throw InternalServerErrorException when Nova Poshta returns success: false', async () => {
      httpService.post.mockReturnValue(npFailure(['some error']));

      await expect(service.getCities()).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when the HTTP request fails', async () => {
      httpService.post.mockReturnValue(throwError(() => new Error('Network error')));

      await expect(service.getCities()).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ─── getWarehouses ────────────────────────────────────────────────────────

  describe('getWarehouses', () => {
    it('should return mapped warehouse options', async () => {
      httpService.post.mockReturnValue(npSuccess([mockNpBranch]));

      const result = await service.getWarehouses('Київ');

      expect(result).toEqual([
        {
          ref: 'warehouse-ref-1',
          number: '42',
          label: 'Відділення №42',
          fullAddress: 'Київ, вул. Хрещатик, 22',
          isPostMachine: false,
        },
      ]);
    });

    it('should set isPostMachine: true for post machine warehouses', async () => {
      httpService.post.mockReturnValue(npSuccess([mockNpPostMachine]));

      const result = await service.getWarehouses('Київ');

      expect(result[0].isPostMachine).toBe(true);
    });

    it('should set isPostMachine: false for regular branches', async () => {
      httpService.post.mockReturnValue(npSuccess([mockNpBranch]));

      const result = await service.getWarehouses('Київ');

      expect(result[0].isPostMachine).toBe(false);
    });

    it('should pass CityName in methodProperties', async () => {
      httpService.post.mockReturnValue(npSuccess([mockNpBranch]));

      await service.getWarehouses('Київ');

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          methodProperties: expect.objectContaining({ CityName: 'Київ' }),
        }),
      );
    });

    it('should pass FindByString when search is provided', async () => {
      httpService.post.mockReturnValue(npSuccess([mockNpBranch]));

      await service.getWarehouses('Київ', '42');

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          methodProperties: { CityName: 'Київ', FindByString: '42' },
        }),
      );
    });

    it('should not pass FindByString when search is not provided', async () => {
      httpService.post.mockReturnValue(npSuccess([mockNpBranch]));

      await service.getWarehouses('Київ');

      const call = httpService.post.mock.calls[0][1];
      expect(call.methodProperties).not.toHaveProperty('FindByString');
    });

    it('should throw InternalServerErrorException when Nova Poshta returns success: false', async () => {
      httpService.post.mockReturnValue(npFailure(['city not found']));

      await expect(service.getWarehouses('Київ')).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when the HTTP request fails', async () => {
      httpService.post.mockReturnValue(throwError(() => new Error('Network error')));

      await expect(service.getWarehouses('Київ')).rejects.toThrow(InternalServerErrorException);
    });
  });
});
