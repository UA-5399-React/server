import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { Product } from '@/products/entities/product.schema';

import { CartService } from './cart.service';
import { Cart } from './entities/cart.schema';

const VALID_USER_ID = '507f1f77bcf86cd799439011';
const VALID_PRODUCT_ID = '507f1f77bcf86cd799439012';

const mockProduct = {
  _id: new Types.ObjectId(VALID_PRODUCT_ID),
  title: 'Test Product',
  price: 100,
  productCode: 'TEST-001',
};

const mockCart = {
  userId: new Types.ObjectId(VALID_USER_ID),
  items: [
    {
      product: mockProduct,
      quantity: 2,
    },
  ],
};

const execMock = jest.fn();
const populateMock = jest.fn();

const mockCartModel = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findById: jest.fn(),
};

const mockProductModel = {
  findById: jest.fn(),
};

describe('CartService', () => {
  let service: CartService;

  beforeEach(async () => {
    populateMock.mockReturnValue({ exec: execMock });
    mockCartModel.findOne.mockReturnValue({ populate: populateMock });
    mockCartModel.findOneAndUpdate.mockReturnValue({ populate: populateMock });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: getModelToken(Cart.name),
          useValue: mockCartModel,
        },
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCart', () => {
    it('should return an existing cart', async () => {
      execMock.mockResolvedValue(mockCart);
      const findOneSpy = jest.spyOn(mockCartModel, 'findOne');

      const result = await service.getCart(VALID_USER_ID);

      expect(findOneSpy).toHaveBeenCalledWith({ userId: new Types.ObjectId(VALID_USER_ID) });
      expect(populateMock).toHaveBeenCalledWith('items.product');
      expect(result.userId).toBe(VALID_USER_ID);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(200);
    });

    it('should return a new cart instance if none exists', async () => {
      execMock.mockResolvedValue(null);
      const findOneSpy = jest.spyOn(mockCartModel, 'findOne');

      const result = await service.getCart(VALID_USER_ID);

      expect(findOneSpy).toHaveBeenCalledWith({ userId: new Types.ObjectId(VALID_USER_ID) });
      expect(result.userId).toBe(VALID_USER_ID);
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('updateCart', () => {
    it('should update and return the cart', async () => {
      const updateCartDto = {
        items: [{ productId: VALID_PRODUCT_ID, quantity: 3 }],
      };

      mockProductModel.findById.mockResolvedValue(mockProduct);
      execMock.mockResolvedValue({
        ...mockCart,
        items: [{ product: mockProduct, quantity: 3 }],
      });

      const result = await service.updateCart(VALID_USER_ID, updateCartDto);

      expect(mockProductModel.findById).toHaveBeenCalledWith(VALID_PRODUCT_ID);
      expect(mockCartModel.findOneAndUpdate).toHaveBeenCalled();
      expect(result.items[0].quantity).toBe(3);
      expect(result.total).toBe(300);
    });

    it('should throw NotFoundException if product does not exist', async () => {
      const updateCartDto = {
        items: [{ productId: VALID_PRODUCT_ID, quantity: 3 }],
      };

      mockProductModel.findById.mockResolvedValue(null);

      await expect(service.updateCart(VALID_USER_ID, updateCartDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('syncCart', () => {
    it('should sum quantities for existing products and add new products', async () => {
      const updateCartDto = {
        items: [
          { productId: VALID_PRODUCT_ID, quantity: 3 }, // existing product, current qty 2
          { productId: '507f1f77bcf86cd799439013', quantity: 1 }, // new product
        ],
      };

      const newProduct = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
        title: 'New Product',
        price: 50,
        productCode: 'TEST-002',
      };

      mockProductModel.findById.mockImplementation((id) => {
        if (id === VALID_PRODUCT_ID) return Promise.resolve(mockProduct);
        if (id === '507f1f77bcf86cd799439013') return Promise.resolve(newProduct);
        return Promise.resolve(null);
      });

      const mockCartDoc = {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(VALID_USER_ID),
        items: [{ product: mockProduct._id, quantity: 2 }],
        save: jest.fn().mockResolvedValue(true),
        set: jest.fn().mockImplementation(function (this: any, key: string, value: any) {
          this[key] = value;
        }),
      };

      const populatedCartDoc = {
        _id: mockCartDoc._id,
        userId: mockCartDoc.userId,
        items: [
          { product: mockProduct, quantity: 5 }, // 2 + 3
          { product: newProduct, quantity: 1 },
        ],
      };

      mockCartModel.findOne.mockResolvedValue(mockCartDoc);

      const findByIdMockResult = {
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(populatedCartDoc),
        }),
      };
      // Overwrite findById only for this test
      mockCartModel.findById = jest.fn().mockReturnValue(findByIdMockResult);

      const result = await service.syncCart(VALID_USER_ID, updateCartDto);

      expect(mockCartModel.findOne).toHaveBeenCalledWith({
        userId: new Types.ObjectId(VALID_USER_ID),
      });
      expect(mockCartDoc.save).toHaveBeenCalled();
      expect(mockCartDoc.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ quantity: 5 }),
          expect.objectContaining({ quantity: 1 }),
        ]),
      );

      expect(result.userId).toBe(VALID_USER_ID);
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(550); // (100 * 5) + (50 * 1)
    });
  });
});
