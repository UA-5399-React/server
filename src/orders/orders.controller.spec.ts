import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateShippingAddressDto } from './dto/update-shipping-address.dto';
import { OrderStatus } from './enums/order-status.enum';
import { PaymentMethod } from './enums/payment-method.enum';
import { ShippingCarrier } from './enums/shipping-carrier.enum';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PRODUCT_ID = new Types.ObjectId().toString();

const mockCreateDto: CreateOrderDto = {
  items: [{ product: PRODUCT_ID, amount: 2 }],
  shippingAddress: {
    carrier: ShippingCarrier.NOVA_POST,
    city: 'Kyiv',
    branchNumber: '42',
  },
  user: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+380671234567',
  },
  paymentMethod: PaymentMethod.STRIPE,
};

const mockUpdateAddressDto: UpdateShippingAddressDto = {
  carrier: ShippingCarrier.NOVA_POST,
  city: 'Lviv',
  branchNumber: '7',
};

const mockOrder = {
  orderId: 'ORD-20240318-0001',
  userId: new Types.ObjectId('000000000000000000000001'),
  items: [
    {
      product: new Types.ObjectId(PRODUCT_ID),
      title: 'Test Product',
      unitPrice: 999,
      amount: 2,
    },
  ],
  amount: 1998,
  totalPrice: 1998,
  status: OrderStatus.NEW,
  shippingAddress: mockCreateDto.shippingAddress,
  user: mockCreateDto.user,
  payment: { method: PaymentMethod.STRIPE, status: 'pending' },
};

// ─── Mock service ─────────────────────────────────────────────────────────────

const mockOrdersService = {
  create: jest.fn(),
  findMyOrders: jest.fn(),
  findMyOrderById: jest.fn(),
  cancelMyOrder: jest.fn(),
  updateShippingAddress: jest.fn(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OrdersController', () => {
  let controller: OrdersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: mockOrdersService }],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── POST /orders ──────────────────────────────────────────────────────────

  describe('create', () => {
    it('should delegate to service and return the created order', async () => {
      mockOrdersService.create.mockResolvedValue(mockOrder);

      const result = await controller.create(mockCreateDto);

      expect(mockOrdersService.create).toHaveBeenCalledWith(
        mockCreateDto,
        expect.any(Types.ObjectId),
      );
      expect(result).toEqual(mockOrder);
    });

    it('should propagate BadRequestException when a product is unavailable', async () => {
      mockOrdersService.create.mockRejectedValue(
        new BadRequestException('One or more products are unavailable or do not exist.'),
      );

      await expect(controller.create(mockCreateDto)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── GET /orders/my ───────────────────────────────────────────────────────

  describe('findMyOrders', () => {
    it('should return the list of orders for the current user', async () => {
      mockOrdersService.findMyOrders.mockResolvedValue([mockOrder]);

      const result = await controller.findMyOrders();

      expect(mockOrdersService.findMyOrders).toHaveBeenCalledWith(expect.any(Types.ObjectId));
      expect(result).toEqual([mockOrder]);
    });

    it('should return an empty array when the user has no orders', async () => {
      mockOrdersService.findMyOrders.mockResolvedValue([]);

      const result = await controller.findMyOrders();

      expect(result).toEqual([]);
    });
  });

  // ─── GET /orders/my/:orderId ───────────────────────────────────────────────

  describe('findMyOrderById', () => {
    it('should return the order when it belongs to the current user', async () => {
      mockOrdersService.findMyOrderById.mockResolvedValue(mockOrder);

      const result = await controller.findMyOrderById('ORD-20240318-0001');

      expect(mockOrdersService.findMyOrderById).toHaveBeenCalledWith(
        'ORD-20240318-0001',
        expect.any(Types.ObjectId),
      );
      expect(result).toEqual(mockOrder);
    });

    it('should propagate NotFoundException when the order does not exist', async () => {
      mockOrdersService.findMyOrderById.mockRejectedValue(
        new NotFoundException('Order ORD-INVALID not found.'),
      );

      await expect(controller.findMyOrderById('ORD-INVALID')).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException when the order belongs to another user', async () => {
      mockOrdersService.findMyOrderById.mockRejectedValue(new ForbiddenException('Access denied.'));

      await expect(controller.findMyOrderById('ORD-20240318-0001')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── PATCH /orders/my/:orderId/cancel ─────────────────────────────────────

  describe('cancelMyOrder', () => {
    it('should cancel the order and return the updated document', async () => {
      const cancelled = { ...mockOrder, status: OrderStatus.CANCELLED };
      mockOrdersService.cancelMyOrder.mockResolvedValue(cancelled);

      const result = await controller.cancelMyOrder('ORD-20240318-0001');

      expect(mockOrdersService.cancelMyOrder).toHaveBeenCalledWith(
        'ORD-20240318-0001',
        expect.any(Types.ObjectId),
      );
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should propagate BadRequestException for a non-cancellable status', async () => {
      mockOrdersService.cancelMyOrder.mockRejectedValue(
        new BadRequestException('Order with status "shipped" can no longer be cancelled.'),
      );

      await expect(controller.cancelMyOrder('ORD-20240318-0001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should propagate ForbiddenException when the order belongs to another user', async () => {
      mockOrdersService.cancelMyOrder.mockRejectedValue(new ForbiddenException('Access denied.'));

      await expect(controller.cancelMyOrder('ORD-20240318-0001')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should propagate NotFoundException when the order does not exist', async () => {
      mockOrdersService.cancelMyOrder.mockRejectedValue(
        new NotFoundException('Order ORD-INVALID not found.'),
      );

      await expect(controller.cancelMyOrder('ORD-INVALID')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── PATCH /orders/my/:orderId/shipping-address ────────────────────────────

  describe('updateShippingAddress', () => {
    it('should update the address and return the updated order', async () => {
      const updated = {
        ...mockOrder,
        shippingAddress: mockUpdateAddressDto,
      };
      mockOrdersService.updateShippingAddress.mockResolvedValue(updated);

      const result = await controller.updateShippingAddress(
        'ORD-20240318-0001',
        mockUpdateAddressDto,
      );

      expect(mockOrdersService.updateShippingAddress).toHaveBeenCalledWith(
        'ORD-20240318-0001',
        expect.any(Types.ObjectId),
        mockUpdateAddressDto,
      );
      expect(result.shippingAddress).toEqual(mockUpdateAddressDto);
    });

    it('should propagate BadRequestException when the order is already shipped', async () => {
      mockOrdersService.updateShippingAddress.mockRejectedValue(
        new BadRequestException('Shipping address cannot be changed once the order is "shipped".'),
      );

      await expect(
        controller.updateShippingAddress('ORD-20240318-0001', mockUpdateAddressDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate ForbiddenException when the order belongs to another user', async () => {
      mockOrdersService.updateShippingAddress.mockRejectedValue(
        new ForbiddenException('Access denied.'),
      );

      await expect(
        controller.updateShippingAddress('ORD-20240318-0001', mockUpdateAddressDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should propagate NotFoundException when the order does not exist', async () => {
      mockOrdersService.updateShippingAddress.mockRejectedValue(
        new NotFoundException('Order ORD-INVALID not found.'),
      );

      await expect(
        controller.updateShippingAddress('ORD-INVALID', mockUpdateAddressDto),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
