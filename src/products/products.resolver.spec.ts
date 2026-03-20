import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';

import { Category } from '@/categories/entities/categories.schema';
import { AppLogger } from '@/logger/app-logger.service';
import { ProductStatus } from '@/products/enums/product-status.enum';
import { ProductsQueryArgs } from '@/products/graphql/product-query.args';
import { ProductsResolver } from '@/products/products.resolver';
import { ProductsService } from '@/products/products.service';

import { ValidateProductCategoriesPipe } from './pipes/validate-product-categories.pipe';

const ID = '1';
const mockProduct = {
  _id: ID,
  id: ID,
  imageUrl: 'example.com/image.jpg',
  status: ProductStatus.DRAFT,
  title: 'Laptop',
  categories: ['laptop', 'electronics'],
  description: 'Example of description',
  price: 20000,
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  updatedAt: new Date('2026-03-01T10:00:00.000Z'),
};
const mockProductsPage = {
  items: [mockProduct],
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
};
const mockProductsService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  duplicate: jest.fn(),
  remove: jest.fn(),
};

describe('ProductsResolver', () => {
  let resolver: ProductsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsResolver,
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
        ValidateProductCategoriesPipe,
        {
          provide: getModelToken(Category.name),
          useValue: {
            countDocuments: jest.fn(),
          },
        },
        {
          provide: AppLogger,
          useValue: {
            info: jest.fn(),
            http: jest.fn(),
            graphql: jest.fn(),
            security: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();

    resolver = module.get<ProductsResolver>(ProductsResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('products', () => {
    it('should return paginated products', async () => {
      const args: ProductsQueryArgs = {
        page: 1,
        limit: 10,
        search: 'Laptop',
      };
      mockProductsService.findAll.mockResolvedValue(mockProductsPage);

      const result = await resolver.productsPage(args);

      expect(result).toEqual(mockProductsPage);
      expect(mockProductsService.findAll).toHaveBeenCalledTimes(1);
      expect(mockProductsService.findAll).toHaveBeenCalledWith(args);
    });
  });

  describe('createProduct', () => {
    it('should create a new product', async () => {
      const input = {
        title: 'Laptop',
        imageUrl: 'example.com/image.jpg',
        categories: ['laptop', 'electronics'],
        description: 'Example of description',
        price: 20000,
      };

      mockProductsService.create.mockResolvedValue(mockProduct);

      const result = await resolver.createProduct(input);

      expect(result).toEqual(mockProduct);
      expect(mockProductsService.create).toHaveBeenCalledTimes(1);
      expect(mockProductsService.create).toHaveBeenCalledWith(input);
    });
  });

  describe('getProductById', () => {
    it('should return one product by id', async () => {
      mockProductsService.findOne.mockResolvedValue(mockProduct);

      const result = await resolver.product(ID);

      expect(result).toEqual(mockProduct);
      expect(mockProductsService.findOne).toHaveBeenCalledTimes(1);
      expect(mockProductsService.findOne).toHaveBeenCalledWith(ID);
    });
    it('should throw if service throws', async () => {
      mockProductsService.findOne.mockRejectedValue(new Error('Product not found'));

      await expect(resolver.product(ID)).rejects.toThrow('Product not found');
      expect(mockProductsService.findOne).toHaveBeenCalledWith(ID);
    });
  });

  describe('updateProduct', () => {
    it('should update product', async () => {
      const input = {
        imageUrl: 'example.com/image1.jpg',
        status: ProductStatus.ACTIVE,
        title: 'Phone',
        categories: ['phone'],
        description: 'New Example of description',
        price: 1000,
      };
      const updatedProduct = {
        ...mockProduct,
        ...input,
      };
      mockProductsService.update.mockResolvedValue(updatedProduct);
      const result = await resolver.updateProduct(ID, input);

      expect(result).toEqual(updatedProduct);
      expect(mockProductsService.update).toHaveBeenCalledTimes(1);
      expect(mockProductsService.update).toHaveBeenCalledWith(ID, input);
    });

    it('should throw error when trying to change status to DRAFT', async () => {
      const input = {
        status: ProductStatus.DRAFT,
      };

      mockProductsService.update.mockRejectedValue(new Error('Cannot revert product to draft'));

      await expect(resolver.updateProduct(ID, input)).rejects.toThrow(
        'Cannot revert product to draft',
      );
      expect(mockProductsService.update).toHaveBeenCalledWith(ID, input);
    });
  });

  describe('deleteProduct', () => {
    it('should delete product', async () => {
      const result = await resolver.deleteProduct(ID);
      mockProductsService.remove.mockResolvedValue(true);
      expect(result).toBe(true);
      expect(mockProductsService.remove).toHaveBeenCalledTimes(1);
      expect(mockProductsService.remove).toHaveBeenCalledWith(ID);
    });

    it('should throw error when trying to remove product with status ACTIVE', async () => {
      mockProductsService.remove.mockRejectedValue(
        new Error('Cannot delete product with ACTIVE status'),
      );

      await expect(resolver.deleteProduct(ID)).rejects.toThrow(
        'Cannot delete product with ACTIVE status',
      );
      expect(mockProductsService.remove).toHaveBeenCalledWith(ID);
    });
  });

  describe('duplicateProduct', () => {
    it('should duplicate product', async () => {
      const duplicatedProduct = {
        ...mockProduct,
        _id: '2',
        id: '2',
        title: 'Laptop (Copy)',
        status: ProductStatus.DRAFT,
      };

      mockProductsService.duplicate.mockResolvedValue(duplicatedProduct);

      const result = await resolver.duplicateProduct(ID);

      expect(result).toEqual(duplicatedProduct);
      expect(mockProductsService.duplicate).toHaveBeenCalledTimes(1);
      expect(mockProductsService.duplicate).toHaveBeenCalledWith(ID);
    });
  });
});
