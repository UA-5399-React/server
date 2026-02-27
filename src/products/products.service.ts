import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './entities/product.schema';

@Injectable()
export class ProductsService {
  constructor(@InjectModel(Product.name) private productModel: Model<ProductDocument>) {}

  async findAll(): Promise<Product[]> {
    return this.productModel.find().exec();
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }
    return product;
  }

  async create(data: Omit<Product, 'id'>): Promise<Product> {
    const createdProduct = new this.productModel(data);
    return createdProduct.save();
  }

  async update(id: string, data: Partial<Omit<Product, 'id'>>): Promise<Product> {
    const existingProduct = await this.productModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();

    if (!existingProduct) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }
    return existingProduct;
  }

  async remove(id: string): Promise<void> {
    const deletedProduct = await this.productModel.findByIdAndDelete(id).exec();
    if (!deletedProduct) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }
  }
}
