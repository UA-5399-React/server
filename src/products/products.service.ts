import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Product } from './entities/product.entity';
import { ProductStatus } from './enums/product-status.enum';

@Injectable()
export class ProductsService {
  private products: Product[] = [];

  findAll(): Product[] {
    return this.products;
  }

  findOne(id: string): Product {
    const product = this.products.find((p) => p.id === id);
    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }
    return product;
  }

  create(data: Omit<Product, 'id'>): Product {
    const product: Product = {
      id: randomUUID(),
      ...data,
      status: data.status ?? ProductStatus.DRAFT,
    };
    this.products.push(product);
    return product;
  }

  update(id: string, data: Partial<Omit<Product, 'id'>>): Product {
    const product = this.findOne(id);
    Object.assign(product, data);
    return product;
  }

  remove(id: string): void {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }
    this.products.splice(index, 1);
  }
}
