import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';

import { CreateProductDto } from '@/products/dto/create-product.dto';
import { GetProductsQueryDto } from '@/products/dto/get-products.query.dto';
import { PaginatedProductsDto } from '@/products/dto/paginated-products.dto';
import { Product } from '@/products/entities/product.schema';

import { UpdateProductInput } from './graphql/update-product.input';
import { ProductsService } from './products.service';

@Resolver(() => Product)
export class ProductsResolver {
  constructor(private readonly productsService: ProductsService) {}

  @Query(() => PaginatedProductsDto)
  productsPage(@Args() args: GetProductsQueryDto) {
    return this.productsService.findAll(args);
  }

  @Query(() => Product)
  product(@Args('id', { type: () => ID }) id: string) {
    return this.productsService.findOne(id);
  }

  @Mutation(() => Product)
  createProduct(@Args('input') input: CreateProductDto) {
    return this.productsService.create(input);
  }

  @Mutation(() => Product)
  updateProduct(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateProductInput,
  ) {
    return this.productsService.update(id, input);
  }

  @Mutation(() => Boolean)
  async deleteProduct(@Args('id', { type: () => ID }) id: string) {
    await this.productsService.remove(id);
    return true;
  }

  @ResolveField(() => ID)
  id(@Parent() product: any): string {
    return String(product.id ?? product._id);
  }
}
