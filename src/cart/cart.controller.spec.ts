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
    updateCart: jest.fn().mockResolvedValue(mockCart),
    syncCart: jest.fn().mockResolvedValue(mockCart),
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

  describe('updateCart', () => {
    it('should update and return the user cart', async () => {
      const userId = new Types.ObjectId().toHexString();
      const req = {
        user: {
          id: userId,
          email: 'test@example.com',
          role: Role.CUSTOMER,
        },
      } as unknown as AuthRequest;

      const updateCartDto = {
        items: [{ productId: new Types.ObjectId().toHexString(), quantity: 2 }],
      };

      const updateCartSpy = jest.spyOn(service, 'updateCart');
      const result = await controller.updateCart(req, updateCartDto);

      expect(updateCartSpy).toHaveBeenCalledWith(userId, updateCartDto);
      expect(result).toEqual(mockCart);
    });
  });

  describe('syncCart', () => {
    it('should sync and return the user cart', async () => {
      const userId = new Types.ObjectId().toHexString();
      const req = {
        user: {
          id: userId,
          email: 'test@example.com',
          role: Role.CUSTOMER,
        },
      } as unknown as AuthRequest;

      const updateCartDto = {
        items: [{ productId: new Types.ObjectId().toHexString(), quantity: 2 }],
      };

      mockCartService.syncCart = jest.fn().mockResolvedValue(mockCart);
      const syncCartSpy = jest.spyOn(service, 'syncCart');

      const result = await controller.syncCart(req, updateCartDto);

      expect(syncCartSpy).toHaveBeenCalledWith(userId, updateCartDto);
      expect(result).toEqual(mockCart);
    });
  });
});
