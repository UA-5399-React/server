import { registerEnumType } from '@nestjs/graphql';

export enum GroupBy {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

registerEnumType(GroupBy, {
  name: 'GroupBy',
  description: 'Time grouping granularity for sales dynamics',
});
