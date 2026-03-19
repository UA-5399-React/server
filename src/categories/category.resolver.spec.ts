import { Test, TestingModule } from '@nestjs/testing';

import { CategoryResolver } from '@/categories/category.resolver';
import { CategoryService } from '@/categories/category.service';
import { CategoriesQueryArgs } from '@/categories/graphql/category-query.args';

const ID = '67ca4f63c89e9c1a5d9f5f10';
const mockCategory = {
  _id: ID,
  title: 'Electronics',
  imageUrl: 'https://example.com/category.jpg',
  description: 'Devices and gadgets',
  parent: null,
  depth: 1,
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  updatedAt: new Date('2026-03-01T10:00:00.000Z'),
};
const mockCategoriesPage = {
  items: [mockCategory],
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
};
const mockCategoryService = {
  findAll: jest.fn(),
  findPage: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('CategoryResolver', () => {
  let resolver: CategoryResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryResolver,
        {
          provide: CategoryService,
          useValue: mockCategoryService,
        },
      ],
    }).compile();

    resolver = module.get<CategoryResolver>(CategoryResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('categoriesList', () => {
    it('should return categories list', async () => {
      const categories = [mockCategory];
      mockCategoryService.findAll.mockResolvedValue(categories);

      const result = await resolver.findAllCategories();

      expect(result).toEqual(categories);
      expect(mockCategoryService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('categoriesPage', () => {
    it('should return paginated categories', async () => {
      const args: CategoriesQueryArgs = {
        page: 1,
        limit: 10,
        search: 'Electronics',
      };
      mockCategoryService.findPage.mockResolvedValue(mockCategoriesPage);

      const result = await resolver.categoriesPage(args);

      expect(result).toEqual(mockCategoriesPage);
      expect(mockCategoryService.findPage).toHaveBeenCalledTimes(1);
      expect(mockCategoryService.findPage).toHaveBeenCalledWith(args);
    });
  });

  describe('category', () => {
    it('should return one category by id', async () => {
      mockCategoryService.findOne.mockResolvedValue(mockCategory);

      const result = await resolver.findOneCategory(ID);

      expect(result).toEqual(mockCategory);
      expect(mockCategoryService.findOne).toHaveBeenCalledTimes(1);
      expect(mockCategoryService.findOne).toHaveBeenCalledWith(ID);
    });
  });

  describe('createCategory', () => {
    it('should create category', async () => {
      const input = {
        title: 'Accessories',
        description: 'Small accessories',
        depth: 1,
      };
      const createdCategory = {
        ...mockCategory,
        ...input,
      };

      mockCategoryService.create.mockResolvedValue(createdCategory);

      const result = await resolver.createCategory(input);

      expect(result).toEqual(createdCategory);
      expect(mockCategoryService.create).toHaveBeenCalledTimes(1);
      expect(mockCategoryService.create).toHaveBeenCalledWith(input);
    });
  });

  describe('updateCategory', () => {
    it('should update category', async () => {
      const input = {
        _id: ID,
        title: 'Updated Electronics',
      };
      const updatedCategory = {
        ...mockCategory,
        title: input.title,
      };

      mockCategoryService.update.mockResolvedValue(updatedCategory);

      const result = await resolver.updateCategory(input);

      expect(result).toEqual(updatedCategory);
      expect(mockCategoryService.update).toHaveBeenCalledTimes(1);
      expect(mockCategoryService.update).toHaveBeenCalledWith(input);
    });
  });

  describe('deleteCategory', () => {
    it('should delete category', async () => {
      mockCategoryService.remove.mockResolvedValue(mockCategory);

      const result = await resolver.deleteCategory(ID);

      expect(result).toEqual(mockCategory);
      expect(mockCategoryService.remove).toHaveBeenCalledTimes(1);
      expect(mockCategoryService.remove).toHaveBeenCalledWith(ID);
    });
  });
});
