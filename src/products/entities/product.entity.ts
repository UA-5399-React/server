import { ProductStatus } from '../enums/product-status.enum';

export class Product {
  id: string;
  imageUrl: string;
  status: ProductStatus;
  title: string;
  tags: string[];
  description: string;
  price: number;
}
