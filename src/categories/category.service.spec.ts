import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';

import { CategoryService } from '@/categories/category.service';
import { Category } from '@/categories/entities/categories.schema';
import { CategoriesQueryArgs } from '@/categories/graphql/category-query.args';

const ROOT_ID = '67ca4f63c89e9c1a5d9f5f10';

const mockParentCategory = {
  _id: ROOT_ID,
  title: 'Electronics',
  imageUrl: 'https://example.com/category.jpg',
  description: 'Devices and gadgets',
  parent: null,
  depth: 1,
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  updatedAt: new Date('2026-03-02T10:00:00.000Z'),
};

const mockChildCategory = {
  _id: '67ca4f63c89e9c1a5d9f5f11',
  title: 'Laptops',
  imageUrl: 'https://example.com/laptops.jpg',
  description: 'Portable computers',
  parent: ROOT_ID,
  depth: 2,
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  updatedAt: new Date('2026-03-02T09:00:00.000Z'),
};

const parentExecMock = jest.fn();
const parentLimitMock = jest.fn();
const parentSkipMock = jest.fn();
const parentSortMock = jest.fn();
const childExecMock = jest.fn();
const childSortMock = jest.fn();
const countExecMock = jest.fn();

type MockCategoryModelType = {
  find: jest.Mock;
  findById: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  findByIdAndDelete: jest.Mock;
  countDocuments: jest.Mock;
};

const mockCategoryModel: MockCategoryModelType = {
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  countDocuments: jest.fn(),
};

describe('CategoryService', () => {
  let service: CategoryService;

  beforeEach(async () => {
    parentSortMock.mockReturnValue({ skip: parentSkipMock });
    parentSkipMock.mockReturnValue({ limit: parentLimitMock });
    parentLimitMock.mockReturnValue({ exec: parentExecMock });
    childSortMock.mockReturnValue({ exec: childExecMock });

    mockCategoryModel.find
      .mockReturnValueOnce({ sort: parentSortMock })
      .mockReturnValueOnce({ sort: childSortMock });
    mockCategoryModel.countDocuments.mockReturnValue({ exec: countExecMock });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: getModelToken(Category.name),
          useValue: mockCategoryModel,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findPage', () => {
    it('should return paginated parent categories with their children', async () => {
      parentExecMock.mockResolvedValue([mockParentCategory]);
      childExecMock.mockResolvedValue([mockChildCategory]);
      countExecMock.mockResolvedValue(1);

      const query: CategoriesQueryArgs = {
        page: 1,
        limit: 10,
      };

      const result = await service.findPage(query);

      expect(result).toEqual({
        items: [mockParentCategory, mockChildCategory],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(mockCategoryModel.find).toHaveBeenNthCalledWith(1, { depth: 1 });
      expect(parentSortMock).toHaveBeenCalledWith({ updatedAt: -1 });
      expect(parentSkipMock).toHaveBeenCalledWith(0);
      expect(parentLimitMock).toHaveBeenCalledWith(10);
      expect(mockCategoryModel.countDocuments).toHaveBeenCalledWith({ depth: 1 });
      expect(mockCategoryModel.find).toHaveBeenNthCalledWith(2, {
        parent: { $in: [expect.any(Object)] },
      });
      expect(childSortMock).toHaveBeenCalledWith({ updatedAt: -1 });
    });

    it('should apply search filter to parent categories only', async () => {
      parentExecMock.mockResolvedValue([mockParentCategory]);
      childExecMock.mockResolvedValue([]);
      countExecMock.mockResolvedValue(1);

      await service.findPage({
        page: 1,
        limit: 10,
        search: '  Electro  ',
      });

      expect(mockCategoryModel.find).toHaveBeenNthCalledWith(1, {
        depth: 1,
        $or: [
          { title: { $regex: 'Electro', $options: 'i' } },
          { description: { $regex: 'Electro', $options: 'i' } },
        ],
      });
      expect(mockCategoryModel.countDocuments).toHaveBeenCalledWith({
        depth: 1,
        $or: [
          { title: { $regex: 'Electro', $options: 'i' } },
          { description: { $regex: 'Electro', $options: 'i' } },
        ],
      });
    });

    it('should skip child query when no parent categories are found', async () => {
      parentExecMock.mockResolvedValue([]);
      countExecMock.mockResolvedValue(0);

      const result = await service.findPage({
        page: 2,
        limit: 5,
      });

      expect(result).toEqual({
        items: [],
        total: 0,
        page: 2,
        limit: 5,
        totalPages: 0,
      });
      expect(mockCategoryModel.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('should delete category when it has no subcategories', async () => {
      countExecMock.mockResolvedValue(0);
      mockCategoryModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockParentCategory),
      });

      const result = await service.remove(ROOT_ID);

      expect(result).toEqual(mockParentCategory);
      expect(mockCategoryModel.countDocuments).toHaveBeenCalledWith({
        parent: ROOT_ID,
      });
      expect(mockCategoryModel.findByIdAndDelete).toHaveBeenCalledWith(ROOT_ID);
    });

    it('should throw when category has subcategories', async () => {
      countExecMock.mockResolvedValue(1);

      await expect(service.remove(ROOT_ID)).rejects.toThrow(
        new BadRequestException('Cannot delete category with subcategories'),
      );
      expect(mockCategoryModel.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('should throw when category is not found', async () => {
      countExecMock.mockResolvedValue(0);
      mockCategoryModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove(ROOT_ID)).rejects.toThrow(
        new NotFoundException(`Category with id ${ROOT_ID} not found`),
      );
    });
  });
});
