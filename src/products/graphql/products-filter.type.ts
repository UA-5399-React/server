import { ProductStatus } from '@/products/enums/product-status.enum';

export type GqlFilters = {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: ProductStatus;
  updatedFrom?: Date;
  updatedTo?: Date;
};
