import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';

import { GqlAuthGuard } from '@/auth/guards/gql-auth.guard';
import { CreateProductInput } from '@/products/graphql/create-product.input';
import { ProductType } from '@/products/graphql/product.type';
import { ProductsQueryArgs } from '@/products/graphql/product-query.args';
import { ProductsPageType } from '@/products/graphql/products-page.type';

import { UpdateProductInput } from './graphql/update-product.input';
import { ProductsService } from './products.service';

@UseGuards(GqlAuthGuard)
@Resolver(() => ProductType)
export class ProductsResolver {
  constructor(private readonly productsService: ProductsService) {}

  @Query(() => ProductsPageType)
  productsPage(@Args() args: ProductsQueryArgs) {
    return this.productsService.findAll(args);
  }

  @Query(() => ProductType)
  product(@Args('id', { type: () => ID }) id: string) {
    return this.productsService.findOne(id);
  }

  @Mutation(() => ProductType)
  createProduct(@Args('input') input: CreateProductInput) {
    return this.productsService.create(input);
  }

  @Mutation(() => ProductType)
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

  @Mutation(() => ProductType)
  duplicateProduct(@Args('id', { type: () => ID }) id: string) {
    return this.productsService.duplicate(id);
  }

  /*@Query(() => [String])
  categories() {
    return this.productsService.getCategories();
  }*/
}
