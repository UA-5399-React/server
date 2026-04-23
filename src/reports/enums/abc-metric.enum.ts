import { registerEnumType } from '@nestjs/graphql';

export enum AbcMetricEnum {
  UNITS = 'UNITS',
  REVENUE = 'REVENUE',
}

registerEnumType(AbcMetricEnum, { name: 'AbcMetricEnum' });
