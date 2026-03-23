import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { AuthRequest } from '@/auth/types/auth-request.type';
import { Role } from '@/users/enums/role.enum';

import { CartController } from './cart.controller';
import { CartService } from './cart.service';

describe('CartController', () => {
  let controller: CartController;
  let service: CartService;

  const mockCart = {
    userId: new Types.ObjectId(),
    items: [],
  };

  const mockCartService = {
    getCart: jest.fn().mockResolvedValue(mockCart),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: mockCartService,
        },
      ],
    }).compile();

    controller = module.get<CartController>(CartController);
    service = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCart', () => {
    it('should return the user cart', async () => {
      const userId = new Types.ObjectId().toHexString();
      const req = {
        user: {
          id: userId,
          email: 'test@example.com',
          role: Role.CUSTOMER,
        },
      } as unknown as AuthRequest;

      const getCartSpy = jest.spyOn(service, 'getCart');
      const result = await controller.getCart(req);

      expect(getCartSpy).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockCart);
    });
  });
});
