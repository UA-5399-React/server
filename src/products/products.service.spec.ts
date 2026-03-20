import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { SortOrder } from '@/common/enums/sort-order.enum';
import { Product } from '@/products/entities/product.schema';
import { ProductSortField } from '@/products/enums/product-sort-field.enum';
import { ProductStatus } from '@/products/enums/product-status.enum';
import { ProductsQueryArgs } from '@/products/graphql/product-query.args';
import { ProductsService } from '@/products/products.service';

const VALID_ID = '507f1f77bcf86cd799439011';
const INVALID_ID = '123';

const mockProduct = {
  _id: VALID_ID,
  id: VALID_ID,
  imageUrl: 'example.com/image.jpg',
  imagePublicId: 'products/example-image',
  status: ProductStatus.DRAFT,
  title: 'Laptop',
  categories: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
  description: 'Example of description',
  price: 20000,
  productCode: '0000009',
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  updatedAt: new Date('2026-03-01T10:00:00.000Z'),
};

const execMock = jest.fn();
const sortMock = jest.fn();
const skipMock = jest.fn();
const limitMock = jest.fn();
const countExecMock = jest.fn();

const saveMock = jest.fn();

type MockProductModelType = jest.Mock & {
  find: jest.Mock;
  findById: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  findByIdAndDelete: jest.Mock;
  findOne: jest.Mock;
  countDocuments: jest.Mock;
  create: jest.Mock;
  distinct: jest.Mock;
};

const mockProductModel: MockProductModelType = Object.assign(
  jest.fn().mockImplementation((dto: ProductsQueryArgs) => ({
    ...dto,
    save: saveMock,
  })),
  {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    distinct: jest.fn(),
  },
);

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    sortMock.mockReturnValue({ skip: skipMock });
    skipMock.mockReturnValue({ limit: limitMock });
    limitMock.mockReturnValue({ exec: execMock });

    mockProductModel.find.mockReturnValue({ sort: sortMock });
    mockProductModel.countDocuments.mockReturnValue({ exec: countExecMock });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const items = [mockProduct];
      execMock.mockResolvedValue(items);
      countExecMock.mockResolvedValue(1);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        search: 'Laptop',
      });

      expect(result).toEqual({
        items,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      expect(mockProductModel.find).toHaveBeenCalledWith({
        $or: [
          { title: { $regex: 'Laptop', $options: 'i' } },
          { description: { $regex: 'Laptop', $options: 'i' } },
          { productCode: 'Laptop' },
        ],
      });
      expect(sortMock).toHaveBeenCalledWith({ updatedAt: -1 });
      expect(skipMock).toHaveBeenCalledWith(0);
      expect(limitMock).toHaveBeenCalledWith(10);
      expect(mockProductModel.countDocuments).toHaveBeenCalledWith({
        $or: [
          { title: { $regex: 'Laptop', $options: 'i' } },
          { description: { $regex: 'Laptop', $options: 'i' } },
          { productCode: 'Laptop' },
        ],
      });
    });

    it('should apply filters and sorting', async () => {
      execMock.mockResolvedValue([mockProduct]);
      countExecMock.mockResolvedValue(1);

      const query: ProductsQueryArgs = {
        page: 1,
        limit: 10,
        sort: ProductSortField.price,
        order: SortOrder.desc,
        filter: {
          category: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
          minPrice: 100,
          maxPrice: 500,
          status: ProductStatus.ACTIVE,
          updatedFrom: new Date('2026-03-01T00:00:00.000Z'),
          updatedTo: new Date('2026-03-31T23:59:59.999Z'),
        },
      };

      await service.findAll(query);

      const filter = mockProductModel.find.mock.calls[0][0];

      expect(filter.price).toEqual({ $gte: 100, $lte: 500 });
      expect(filter.status).toBe(ProductStatus.ACTIVE);

      expect(filter.updatedAt).toEqual({
        $gte: new Date('2026-03-01T00:00:00.000Z'),
        $lte: new Date('2026-03-31T23:59:59.999Z'),
      });

      // ✅ categories check (important part)
      expect(filter.categories).toBeDefined();
      expect(filter.categories.$in).toHaveLength(2);
      expect(filter.categories.$in[0]).toBeInstanceOf(Types.ObjectId);
      expect(filter.categories.$in[1]).toBeInstanceOf(Types.ObjectId);
      expect(sortMock).toHaveBeenCalledWith({ price: -1 });
      expect(skipMock).toHaveBeenCalledWith(0);
      expect(limitMock).toHaveBeenCalledWith(10);
    });

    it('should throw on invalid price range', async () => {
      const query: ProductsQueryArgs = {
        filter: {
          minPrice: 500,
          maxPrice: 100,
        },
      };

      await expect(service.findAll(query)).rejects.toThrow(
        new BadRequestException('Invalid price range: minPrice must be <= maxPrice'),
      );
    });

    it('should throw on invalid date range', async () => {
      const query: ProductsQueryArgs = {
        filter: {
          updatedFrom: new Date('2026-03-31T23:59:59.999Z'),
          updatedTo: new Date('2026-03-01T00:00:00.000Z'),
        },
      };

      await expect(service.findAll(query)).rejects.toThrow(
        new BadRequestException('Invalid date range: updatedFrom must be <= updatedTo'),
      );
    });
  });

  describe('findOne', () => {
    it('should return product by id', async () => {
      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      const result = await service.findOne(VALID_ID);

      expect(result).toEqual(mockProduct);
      expect(mockProductModel.findById).toHaveBeenCalledWith(VALID_ID);
    });

    it('should throw on invalid id', async () => {
      await expect(service.findOne(INVALID_ID)).rejects.toThrow(
        new BadRequestException(`Invalid product id: "${INVALID_ID}"`),
      );
    });
    it('should throw if product not found', async () => {
      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne(VALID_ID)).rejects.toThrow(
        new NotFoundException(`Product with id "${VALID_ID}" not found`),
      );
    });
  });

  describe('create', () => {
    it('should create new product', async () => {
      mockProductModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({ productCode: '0000009' }),
        }),
      });
      mockProductModel.create.mockResolvedValue({
        ...mockProduct,
        productCode: '0000010',
      });

      const input = {
        title: 'Laptop',
        imageUrl: 'example.com/image.jpg',
        categories: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
        description: 'Example description',
        price: 20000,
      };

      const result = await service.create(input);

      expect(mockProductModel.create).toHaveBeenCalledWith({
        ...input,
        productCode: '0000010',
      });
      expect(result).toEqual({
        ...mockProduct,
        productCode: '0000010',
      });
    });

    it('should start product code sequence when no valid code exists', async () => {
      mockProductModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(null),
        }),
      });
      mockProductModel.create.mockResolvedValue({
        ...mockProduct,
        productCode: '0000001',
      });

      const input = {
        title: 'Phone',
        price: 1200,
      };

      await service.create(input);

      expect(mockProductModel.findOne).toHaveBeenCalledWith({ productCode: /^\d+$/ });
      expect(mockProductModel.create).toHaveBeenCalledWith({
        ...input,
        productCode: '0000001',
      });
    });
  });

  describe('update', () => {
    it('should update product', async () => {
      const updatedProduct = {
        ...mockProduct,
        title: 'Phone',
        status: ProductStatus.ACTIVE,
      };

      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      mockProductModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedProduct),
      });
      const input = {
        title: 'Phone',
        status: ProductStatus.ACTIVE,
      };
      const result = await service.update(VALID_ID, input);

      expect(result).toEqual(updatedProduct);
      expect(mockProductModel.findByIdAndUpdate).toHaveBeenCalledWith(VALID_ID, input, {
        new: true,
      });
    });

    it('should throw on invalid id', async () => {
      await expect(service.update(INVALID_ID, { title: 'Phone' })).rejects.toThrow(
        new BadRequestException(`Invalid product id "${INVALID_ID}"`),
      );
    });

    it('should throw if product not found during update', async () => {
      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update(VALID_ID, { title: 'Phone' })).rejects.toThrow(
        new NotFoundException(`Product with id "${VALID_ID}" not found`),
      );
    });

    it('should throw when trying to revert active product to draft', async () => {
      const activeProduct = {
        ...mockProduct,
        status: ProductStatus.ACTIVE,
      };
      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(activeProduct),
      });

      await expect(service.update(VALID_ID, { status: ProductStatus.DRAFT })).rejects.toThrow(
        new BadRequestException('Cannot revert product to draft'),
      );
    });
  });
  describe('duplicate', () => {
    it('should duplicate product as draft', async () => {
      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });
      mockProductModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({ productCode: '0000009' }),
        }),
      });
      const duplicatedProduct = {
        imageUrl: mockProduct.imageUrl,
        imagePublicId: mockProduct.imagePublicId,
        title: `${mockProduct.title} (Copy)`,
        categories: [...mockProduct.categories],
        description: mockProduct.description,
        price: mockProduct.price,
        status: ProductStatus.DRAFT,
        productCode: '0000010',
      };

      saveMock.mockResolvedValue(duplicatedProduct);

      const result = await service.duplicate(VALID_ID);

      expect(mockProductModel).toHaveBeenCalledWith({
        imageUrl: mockProduct.imageUrl,
        imagePublicId: mockProduct.imagePublicId,
        title: 'Laptop (Copy)',
        categories: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
        description: mockProduct.description,
        price: mockProduct.price,
        status: ProductStatus.DRAFT,
        productCode: '0000010',
      });

      expect(saveMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(duplicatedProduct);
    });
    it('should throw if source product not found', async () => {
      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.duplicate(VALID_ID)).rejects.toThrow(
        new NotFoundException(`Product with id "${VALID_ID}" not found`),
      );
    });
  });
  describe('remove', () => {
    it('should remove draft product', async () => {
      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      mockProductModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      const result = await service.remove(VALID_ID);

      expect(result).toBeUndefined();
      expect(mockProductModel.findByIdAndDelete).toHaveBeenCalledWith(VALID_ID);
    });

    it('should throw if product not found', async () => {
      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(service.remove(VALID_ID)).rejects.toThrow(
        new NotFoundException(`Product with id "${VALID_ID}" not found`),
      );
    });

    it('should throw when trying to delete active product', async () => {
      const activeProduct = {
        ...mockProduct,
        status: ProductStatus.ACTIVE,
      };
      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(activeProduct),
      });
      await expect(service.remove(VALID_ID)).rejects.toThrow(
        'Cannot delete product with status "active". Only draft products can be deleted.',
      );
    });
  });
  /*describe('create', () => {
    it('should ', async () => {
      mockProductModel.distinct.mockResolvedValue([' electronics ', 'laptop', '', '  ', 'apple']);

      const result = await service.getCategories();

      expect(result).toEqual(['apple', 'electronics', 'laptop']);
      expect(mockProductModel.distinct).toHaveBeenCalledWith('categories');
    });
  });*/
});
