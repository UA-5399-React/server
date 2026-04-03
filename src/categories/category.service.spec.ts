import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { CategoryService } from '@/categories/category.service';
import { Category } from '@/categories/entities/categories.schema';
import { CategoriesQueryArgs } from '@/categories/graphql/category-query.args';
import { Product } from '@/products/entities/product.schema';

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
const matchingChildrenExecMock = jest.fn();
const findAllExecMock = jest.fn();
const findByIdExecMock = jest.fn();
const childExecMock = jest.fn();
const childSortMock = jest.fn();
const countExecMock = jest.fn();
const updateManyExecMock = jest.fn();
const deleteExecMock = jest.fn();
const saveMock = jest.fn();

type MockCategoryModelType = jest.Mock & {
  find: jest.Mock;
  findById: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  findByIdAndDelete: jest.Mock;
  countDocuments: jest.Mock;
};

type MockProductModelType = {
  updateMany: jest.Mock;
};

const mockCategoryModel = Object.assign(
  jest.fn().mockImplementation((data) => ({
    ...data,
    save: saveMock,
  })),
  {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
  },
) as MockCategoryModelType;

const mockProductModel: MockProductModelType = {
  updateMany: jest.fn(),
};

describe('CategoryService', () => {
  let service: CategoryService;

  beforeEach(async () => {
    jest.clearAllMocks();

    parentSortMock.mockReturnValue({ skip: parentSkipMock });
    parentSkipMock.mockReturnValue({ limit: parentLimitMock });
    parentLimitMock.mockReturnValue({ exec: parentExecMock });
    matchingChildrenExecMock.mockReset();
    childSortMock.mockReturnValue({ exec: childExecMock });
    mockCategoryModel.countDocuments.mockReturnValue({ exec: countExecMock });
    mockProductModel.updateMany.mockReturnValue({ exec: updateManyExecMock });
    mockCategoryModel.findById.mockReturnValue({ exec: findByIdExecMock });
    mockCategoryModel.findByIdAndDelete.mockReturnValue({ exec: deleteExecMock });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: getModelToken(Category.name),
          useValue: mockCategoryModel,
        },
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all existing categories', async () => {
      mockCategoryModel.find.mockReturnValue({ exec: findAllExecMock });
      findAllExecMock.mockResolvedValue([mockParentCategory, mockChildCategory]);

      const result = await service.findAll();

      expect(result).toEqual([mockParentCategory, mockChildCategory]);
      expect(mockCategoryModel.find).toHaveBeenCalledWith();
    });

    it('should throw when categories are not found', async () => {
      mockCategoryModel.find.mockReturnValue({ exec: findAllExecMock });
      findAllExecMock.mockResolvedValue(null);

      await expect(service.findAll()).rejects.toThrow(new NotFoundException('No categories found'));
    });
  });

  describe('findPage', () => {
    it('should return paginated parent categories with their children', async () => {
      mockCategoryModel.find
        .mockReturnValueOnce({ sort: parentSortMock })
        .mockReturnValueOnce({ sort: childSortMock });
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
        $expr: {
          $in: [{ $toString: '$parent' }, [ROOT_ID]],
        },
      });
      expect(childSortMock).toHaveBeenCalledWith({ updatedAt: -1 });
    });

    it('should apply search filter to parent categories only', async () => {
      mockCategoryModel.find
        .mockReturnValueOnce({ exec: matchingChildrenExecMock })
        .mockReturnValueOnce({ sort: parentSortMock })
        .mockReturnValueOnce({ sort: childSortMock });
      matchingChildrenExecMock.mockResolvedValue([]);
      parentExecMock.mockResolvedValue([mockParentCategory]);
      childExecMock.mockResolvedValue([]);
      countExecMock.mockResolvedValue(1);

      await service.findPage({
        page: 1,
        limit: 10,
        search: '  Electro  ',
      });

      expect(mockCategoryModel.find).toHaveBeenNthCalledWith(1, {
        depth: 2,
        $or: [
          { title: { $regex: 'Electro', $options: 'i' } },
          { description: { $regex: 'Electro', $options: 'i' } },
        ],
      });
      expect(mockCategoryModel.find).toHaveBeenNthCalledWith(2, {
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

    it('should include parents of matching subcategories and return only matching children', async () => {
      mockCategoryModel.find
        .mockReturnValueOnce({ exec: matchingChildrenExecMock })
        .mockReturnValueOnce({ sort: parentSortMock })
        .mockReturnValueOnce({ sort: childSortMock });
      matchingChildrenExecMock.mockResolvedValue([mockChildCategory]);
      parentExecMock.mockResolvedValue([mockParentCategory]);
      childExecMock.mockResolvedValue([mockChildCategory]);
      countExecMock.mockResolvedValue(1);

      const result = await service.findPage({
        page: 1,
        limit: 10,
        search: 'Laptop',
      });

      expect(result).toEqual({
        items: [mockParentCategory, mockChildCategory],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(mockCategoryModel.find).toHaveBeenNthCalledWith(1, {
        depth: 2,
        $or: [
          { title: { $regex: 'Laptop', $options: 'i' } },
          { description: { $regex: 'Laptop', $options: 'i' } },
        ],
      });
      expect(mockCategoryModel.find).toHaveBeenNthCalledWith(2, {
        depth: 1,
        $or: [
          { title: { $regex: 'Laptop', $options: 'i' } },
          { description: { $regex: 'Laptop', $options: 'i' } },
          { _id: { $in: [expect.any(Types.ObjectId)] } },
        ],
      });
      expect(mockCategoryModel.find).toHaveBeenNthCalledWith(3, {
        $expr: {
          $in: [{ $toString: '$parent' }, [ROOT_ID]],
        },
        $or: [
          { title: { $regex: 'Laptop', $options: 'i' } },
          { description: { $regex: 'Laptop', $options: 'i' } },
        ],
      });
      expect(mockCategoryModel.countDocuments).toHaveBeenCalledWith({
        depth: 1,
        $or: [
          { title: { $regex: 'Laptop', $options: 'i' } },
          { description: { $regex: 'Laptop', $options: 'i' } },
          { _id: { $in: [expect.any(Types.ObjectId)] } },
        ],
      });
    });

    it('should skip child query when no parent categories are found', async () => {
      mockCategoryModel.find.mockReturnValueOnce({ sort: parentSortMock });
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

  describe('findOne', () => {
    it('should return category by id', async () => {
      findByIdExecMock.mockResolvedValue(mockParentCategory);

      const result = await service.findOne(ROOT_ID);

      expect(result).toEqual(mockParentCategory);
      expect(mockCategoryModel.findById).toHaveBeenCalledWith(ROOT_ID);
    });

    it('should throw when category is not found', async () => {
      findByIdExecMock.mockResolvedValue(null);

      await expect(service.findOne(ROOT_ID)).rejects.toThrow(
        new NotFoundException(`Category with id ${ROOT_ID} not found`),
      );
    });
  });

  describe('create', () => {
    it('should create category with null parent when parent is not provided', async () => {
      const createInput = {
        title: 'Accessories',
        imageUrl: 'https://example.com/accessories.jpg',
        description: 'Useful accessories',
      };
      const createdCategory = {
        ...createInput,
        parent: null,
      };
      saveMock.mockResolvedValue(createdCategory);

      const result = await service.create(createInput);

      expect(mockCategoryModel).toHaveBeenCalledWith({
        ...createInput,
        parent: null,
      });
      expect(saveMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(createdCategory);
    });

    it('should create category with provided parent', async () => {
      const createInput = {
        title: 'Accessories',
        imageUrl: 'https://example.com/accessories.jpg',
        description: 'Useful accessories',
        parent: ROOT_ID,
      };
      const createdCategory = {
        ...createInput,
        parent: new Types.ObjectId(ROOT_ID),
      };
      saveMock.mockResolvedValue(createdCategory);

      const result = await service.create(createInput);

      expect(mockCategoryModel).toHaveBeenCalledWith({
        ...createInput,
        parent: expect.any(Types.ObjectId),
      });
      expect(saveMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(createdCategory);
    });

    it('should throw when parent id is invalid during create', async () => {
      await expect(
        service.create({
          title: 'Accessories',
          description: 'Useful accessories',
          parent: 'not-an-object-id',
          depth: 2,
        }),
      ).rejects.toThrow(new BadRequestException('Invalid parent category id'));

      expect(mockCategoryModel).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update category and return updated entity', async () => {
      const updateInput = {
        _id: ROOT_ID,
        title: 'Updated electronics',
        description: 'Updated description',
      };
      const updatedCategory = {
        ...mockParentCategory,
        ...updateInput,
      };
      mockCategoryModel.findByIdAndUpdate.mockResolvedValue(updatedCategory);

      const result = await service.update(updateInput);

      expect(mockCategoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
        ROOT_ID,
        {
          title: 'Updated electronics',
          description: 'Updated description',
        },
        { new: true },
      );
      expect(result).toEqual(updatedCategory);
    });

    it('should normalize empty parent to null during update', async () => {
      const updateInput = {
        _id: ROOT_ID,
        parent: '',
      };
      const updatedCategory = {
        ...mockParentCategory,
        parent: null,
      };
      mockCategoryModel.findByIdAndUpdate.mockResolvedValue(updatedCategory);

      const result = await service.update(updateInput);

      expect(mockCategoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
        ROOT_ID,
        { parent: null },
        { new: true },
      );
      expect(result).toEqual(updatedCategory);
    });

    it('should convert parent id to ObjectId during update', async () => {
      const updateInput = {
        _id: ROOT_ID,
        parent: '67ca4f63c89e9c1a5d9f5f11',
      };
      const updatedCategory = {
        ...mockParentCategory,
        parent: new Types.ObjectId(updateInput.parent),
      };
      mockCategoryModel.findByIdAndUpdate.mockResolvedValue(updatedCategory);

      const result = await service.update(updateInput);

      expect(mockCategoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
        ROOT_ID,
        { parent: expect.any(Types.ObjectId) },
        { new: true },
      );
      expect(result).toEqual(updatedCategory);
    });

    it('should throw when parent id is invalid during update', async () => {
      await expect(
        service.update({
          _id: ROOT_ID,
          parent: 'not-an-object-id',
        }),
      ).rejects.toThrow(new BadRequestException('Invalid parent category id'));

      expect(mockCategoryModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should throw when updated category is not found', async () => {
      mockCategoryModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        service.update({
          _id: ROOT_ID,
          title: 'Missing category',
        }),
      ).rejects.toThrow(new NotFoundException(`Category with id ${ROOT_ID} not found`));
    });
  });

  describe('remove', () => {
    it('should delete category when it has no subcategories', async () => {
      countExecMock.mockResolvedValue(0);
      deleteExecMock.mockResolvedValue(mockParentCategory);

      const result = await service.remove(ROOT_ID);

      expect(result).toEqual(mockParentCategory);
      expect(mockCategoryModel.countDocuments).toHaveBeenCalledWith({
        $expr: {
          $in: [{ $toString: '$parent' }, [ROOT_ID]],
        },
      });
      expect(mockProductModel.updateMany).toHaveBeenCalledWith(
        { categories: expect.any(Object) },
        { $pull: { categories: expect.any(Object) } },
      );
      expect(mockCategoryModel.findByIdAndDelete).toHaveBeenCalledWith(ROOT_ID);
    });

    it('should throw when category has subcategories', async () => {
      countExecMock.mockResolvedValue(1);

      await expect(service.remove(ROOT_ID)).rejects.toThrow(
        new BadRequestException('Cannot delete category with subcategories'),
      );
      expect(mockProductModel.updateMany).not.toHaveBeenCalled();
      expect(mockCategoryModel.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('should throw when category is not found', async () => {
      countExecMock.mockResolvedValue(0);
      deleteExecMock.mockResolvedValue(null);

      await expect(service.remove(ROOT_ID)).rejects.toThrow(
        new NotFoundException(`Category with id ${ROOT_ID} not found`),
      );
      expect(mockProductModel.updateMany).toHaveBeenCalledTimes(1);
    });
  });
});
