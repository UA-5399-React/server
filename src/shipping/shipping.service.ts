import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { NP_API_URL, NP_WAREHOUSE_TYPES } from './nova-poshta.constants';
import { CityOption, NpCity, NpResponse, NpWarehouse, WarehouseOption } from './types';

@Injectable()
export class ShippingService {
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.getOrThrow<string>('NOVA_POSHTA_API_KEY');
  }

  async getCities(search?: string): Promise<CityOption[]> {
    const data = await this.call<NpCity>({
      modelName: 'Address',
      calledMethod: 'getCities',
      methodProperties: search ? { FindByString: search } : {},
    });

    return data.map((c) => ({
      ref: c.Ref,
      name: c.Description,
      area: c.AreaDescription,
    }));
  }

  async getWarehouses(cityName: string, search?: string): Promise<WarehouseOption[]> {
    const data = await this.call<NpWarehouse>({
      modelName: 'AddressGeneral',
      calledMethod: 'getWarehouses',
      methodProperties: {
        CityName: cityName,
        ...(search && { FindByString: search }),
      },
    });

    return data.map((w) => ({
      ref: w.Ref,
      number: w.Number,
      label: w.Description,
      fullAddress: w.ShortAddress,
      isPostMachine: w.TypeOfWarehouse === NP_WAREHOUSE_TYPES.POST_MACHINE,
    }));
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
