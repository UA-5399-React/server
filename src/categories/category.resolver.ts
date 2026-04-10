import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';

import { Roles } from '@/auth/decorators/Roles';
import { GqlAuthGuard } from '@/auth/guards/gql-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { ProductType } from '@/products/graphql/product.type';
import { ProductsQueryArgs } from '@/products/graphql/product-query.args';
import { ProductsService } from '@/products/products.service';
import { Role } from '@/users/enums/role.enum';

import { CategoryService } from './category.service';
import { CategoriesPageType } from './graphql/categories-page.type';
import { CategoryType } from './graphql/category.type';
import { CategoriesQueryArgs } from './graphql/category-query.args';
import { CreateCategoryInput } from './graphql/create-category.input';
import { UpdateCategoryInput } from './graphql/update-category.input';

@UseGuards(GqlAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Resolver(() => CategoryType)
export class CategoryResolver {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly productsService: ProductsService,
  ) {}

  @Query(() => [CategoryType], { name: 'categoriesList' })
  findAllCategories() {
    return this.categoryService.findAll();
  }

  @Query(() => CategoriesPageType)
  categoriesPage(@Args() args: CategoriesQueryArgs) {
    return this.categoryService.findPage(args);
  }

  @Query(() => CategoryType, { name: 'category' })
  findOneCategory(@Args('id', { type: () => ID }) id: string) {
    return this.categoryService.findOne(id);
  }

  @ResolveField(() => [ProductType])
  async products(@Parent() category: CategoryType) {
    const categoryId = category._id.toString();

    const args: Partial<ProductsQueryArgs> = {
      filter: {
        category: [categoryId],
      },
    };

    const result = await this.productsService.findAll(args as ProductsQueryArgs);
    return result.items || [];
  }

  @Mutation(() => CategoryType)
  createCategory(@Args('createCategoryInput') createCategoryInput: CreateCategoryInput) {
    return this.categoryService.create(createCategoryInput);
  }

  @Mutation(() => CategoryType)
  updateCategory(@Args('updateCategoryInput') updateCategoryInput: UpdateCategoryInput) {
    return this.categoryService.update(updateCategoryInput);
  }

  @Mutation(() => CategoryType)
  deleteCategory(@Args('id', { type: () => ID }) id: string) {
    return this.categoryService.remove(id);
  }
}
