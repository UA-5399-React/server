import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { CartService } from './cart.service';
import { Cart } from './entities/cart.schema';

const VALID_USER_ID = '507f1f77bcf86cd799439011';

const mockCart = {
  userId: new Types.ObjectId(VALID_USER_ID),
  items: [
    {
      product: new Types.ObjectId(),
      quantity: 2,
    },
  ],
};

const execMock = jest.fn();
const populateMock = jest.fn();

const mockCartModel = Object.assign(
  jest.fn().mockImplementation((data: any) => ({
    ...data,
    save: jest.fn().mockResolvedValue(data),
  })),
  {
    findOne: jest.fn(),
  },
);

describe('CartService', () => {
  let service: CartService;

  beforeEach(async () => {
    populateMock.mockReturnValue({ exec: execMock });
    mockCartModel.findOne.mockReturnValue({ populate: populateMock });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: getModelToken(Cart.name),
          useValue: mockCartModel,
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
});
