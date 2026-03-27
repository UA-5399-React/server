import { HttpService } from '@nestjs/axios';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { AppLogger } from '@/logger/app-logger.service';

import { NP_API_URL, NP_CACHE_TTL, NP_WAREHOUSE_TYPES } from './nova-poshta.constants';
import { CityOption, NpCity, NpResponse, NpWarehouse, WarehouseOption } from './types';

@Injectable()
export class ShippingService {
  private readonly apiKey: string;
  private readonly logger = new AppLogger();

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    this.apiKey = this.config.getOrThrow<string>('NOVA_POSHTA_API_KEY');
  }

  async getCities(search?: string): Promise<CityOption[]> {
    const key = `cities:${search ?? ''}`;
    const cached = await this.cache.get<CityOption[]>(key);
    if (cached) {
      this.logger.log(`[CACHE HIT] ${key}`);
      return cached;
    }

    this.logger.log(`[CACHE MISS] ${key}`);

    const data = await this.call<NpCity>({
      modelName: 'Address',
      calledMethod: 'getCities',
      methodProperties: search ? { FindByString: search } : {},
    });

    const result = data.map((c) => ({
      ref: c.Ref,
      name: c.Description,
      area: c.AreaDescription,
    }));

    await this.cache.set(key, result, NP_CACHE_TTL.CITIES);
    return result;
  }

  async getWarehouses(cityName: string, search?: string): Promise<WarehouseOption[]> {
    const key = `warehouses:${cityName}:${search ?? ''}`;
    const cached = await this.cache.get<WarehouseOption[]>(key);
    if (cached) return cached;

    const data = await this.call<NpWarehouse>({
      modelName: 'AddressGeneral',
      calledMethod: 'getWarehouses',
      methodProperties: {
        CityName: cityName,
        ...(search && { FindByString: search }),
      },
    });

    const result = data.map((w) => ({
      ref: w.Ref,
      number: w.Number,
      label: w.Description,
      fullAddress: w.ShortAddress,
      isPostMachine: w.TypeOfWarehouse === NP_WAREHOUSE_TYPES.POST_MACHINE,
    }));

    await this.cache.set(key, result, NP_CACHE_TTL.WAREHOUSES);
    return result;
  }

  private async call<T>(body: {
    modelName: string;
    calledMethod: string;
    methodProperties: object;
  }): Promise<T[]> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<NpResponse<T>>(NP_API_URL, {
          apiKey: this.apiKey,
          ...body,
        }),
      );

      if (!data.success) {
        throw new InternalServerErrorException(`Nova Poshta error: ${data.errors.join(', ')}`);
      }

      return data.data;
    } catch (err) {
      if (err instanceof InternalServerErrorException) throw err;
      throw new InternalServerErrorException('Failed to reach Nova Poshta API.');
    }
  }
}
