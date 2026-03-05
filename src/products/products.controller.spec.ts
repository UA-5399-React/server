import { Test, TestingModule } from '@nestjs/testing';

import { ProductStatus } from './enums/product-status.enum';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

//moking product for test
const mockProduct = {
  _id: '1',
  imageUrl: 'example.com',
  status: ProductStatus.DRAFT,
  title: 'Laptop',
  tags: ['laptop', 'electronics'],
  description: 'Example of description',
  price: 20000,
};

//mocking productsService
const mockProductsService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  duplicate: jest.fn(),
  changeStatus: jest.fn(),
  remove: jest.fn(),
};

describe('ProductsControler', () => {
  let controller: ProductsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  //testing 'findAll', should return an array with only mockProduct inside
  describe('findAll', () => {
    it('should return all existing products', async () => {
      mockProductsService.findAll.mockReturnValue([mockProduct]);
      expect(await controller.findAll()).toEqual([mockProduct]);
      expect(mockProductsService.findAll).toHaveBeenCalled();
    });
  });

  //testing 'findOne', sjould return mockProduct object
  describe('findOne', () => {
    it('should return 1 product by id', async () => {
      mockProductsService.findOne.mockReturnValue(mockProduct);
      expect(await controller.findOne('1')).toEqual(mockProduct);
      expect(mockProductsService.findOne).toHaveBeenCalledWith('1');
    });
  });

  //testing 'create', should create new mockProduct
  describe('create', () => {
    it('should create a new product', async () => {
      mockProductsService.create.mockReturnValue(mockProduct);
      expect(await controller.create(mockProduct)).toEqual(mockProduct);
      expect(mockProductsService.create).toHaveBeenCalledWith(mockProduct);
    });
  });

  //testing 'update', should update value 'price' for mockProduct
  describe('update', () => {
    it('should update product (proce for this case)', async () => {
      const updateValue = { price: 30000 };
      const updatedProduct = { ...mockProduct, price: 30000 };
      mockProductsService.update.mockReturnValue(updatedProduct);
      expect(await controller.update('1', updateValue)).toEqual(updatedProduct);
      expect(mockProductsService.update).toHaveBeenCalledWith('1', updateValue);
    });
  });

  describe('duplicate', () => {
    it('should return the duplicated product', async () => {
      const duplicatedProduct = {
        ...mockProduct,
        _id: '2',
        title: 'Laptop (Copy)',
        status: ProductStatus.DRAFT,
      };
      mockProductsService.duplicate.mockReturnValue(duplicatedProduct);
      expect(await controller.duplicate('1')).toEqual(duplicatedProduct);
      expect(mockProductsService.duplicate).toHaveBeenCalledWith('1');
    });
  });

  describe('changeStatus', () => {
    it('should update product status and return updated product', async () => {
      const updatedProduct = { ...mockProduct, status: ProductStatus.ACTIVE };
      mockProductsService.changeStatus.mockReturnValue(updatedProduct);
      expect(
        await controller.changeStatus('1', { status: ProductStatus.ACTIVE }),
      ).toEqual(updatedProduct);
      expect(mockProductsService.changeStatus).toHaveBeenCalledWith(
        '1',
        ProductStatus.ACTIVE,
      );
    });
  });

  //testing 'remove', should remove mockProduct so value will be undefined and message 'Product deleted successfully' is logged
  describe('remove', () => {
    it('should delete a product and return message', async () => {
      mockProductsService.remove.mockReturnValue(undefined);
      expect(await controller.remove('1')).toEqual({
        message: 'Product deleted successfully',
      });
      expect(mockProductsService.remove).toHaveBeenCalledWith('1');
    });
  });
});
