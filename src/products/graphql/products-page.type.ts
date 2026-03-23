import { ObjectType } from '@nestjs/graphql';

import { PaginatedResponse } from '@/graphql/types/paginated-response';
import { ProductType } from '@/products/graphql/product.type';

@ObjectType()
export class ProductsPageType extends PaginatedResponse(ProductType) {}
