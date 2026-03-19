import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';

import { CategoryService } from './category.service';
import { CategoriesPageType } from './graphql/categories-page.type';
import { CategoryType } from './graphql/category.type';
import { CategoriesQueryArgs } from './graphql/category-query.args';
import { CreateCategoryInput } from './graphql/create-category.input';
import { UpdateCategoryInput } from './graphql/update-category.input';

@Resolver(() => CategoryType)
export class CategoryResolver {
  constructor(private readonly categoryService: CategoryService) {}

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
