import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { ProductStatus } from './enums/product-status.enum';

//moking product for test
const mockProduct: Product = {
  id: '1',
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
    it('should return all existing products', () => {
      mockProductsService.findAll.mockReturnValue([mockProduct]);
      expect(controller.findAll()).toEqual([mockProduct]);
      expect(mockProductsService.findAll).toHaveBeenCalled();
    });
  });

  //testing 'findOne', sjould return mockProduct object
  describe('findOne', () => {
    it('should return 1 product by id', () => {
      mockProductsService.findOne.mockReturnValue(mockProduct);
      expect(controller.findOne('1')).toEqual(mockProduct);
      expect(mockProductsService.findOne).toHaveBeenCalledWith('1');
    });
  });

  //testing 'create', should create new mockProduct
  describe('create', () => {
    it('should create a new product', () => {
      mockProductsService.create.mockReturnValue(mockProduct);
      expect(controller.create(mockProduct)).toEqual(mockProduct);
      expect(mockProductsService.create).toHaveBeenCalledWith(mockProduct);
    });
  });

  //testing 'update', should update value 'price' for mockProduct
  describe('update', () => {
    it('should update product (proce for this case)', () => {
      const updateValue = { price: 30000 };
      const updatedProduct = { ...mockProduct, price: 30000 };
      mockProductsService.update.mockReturnValue(updatedProduct);
      expect(controller.update('1', updateValue)).toEqual(updatedProduct);
      expect(mockProductsService.update).toHaveBeenCalledWith('1', updateValue);
    });
  });

  //testing 'remove', should remove mockProduct so value will be undefined and message 'Product deleted successfully' is logged
  describe('remove', () => {
    it('should delete a product and return message', () => {
      mockProductsService.remove.mockReturnValue(undefined);
      expect(controller.remove('1')).toEqual({
        message: 'Product deleted successfully',
      });
      expect(mockProductsService.remove).toHaveBeenCalledWith('1');
    });
  });
});
