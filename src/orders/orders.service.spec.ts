import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { Product } from '@/products/entities/product.schema';
import { ProductStatus } from '@/products/enums/product-status.enum';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateShippingAddressDto } from './dto/update-shipping-address.dto';
import { Order } from './entities';
import { OrderStatus } from './enums/order-status.enum';
import { PaymentMethod } from './enums/payment-method.enum';
import { ShippingCarrier } from './enums/shipping-carrier.enum';
import { OrdersService } from './orders.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USER_ID = new Types.ObjectId();
const PRODUCT_ID = new Types.ObjectId();

const mockProduct = {
  _id: PRODUCT_ID,
  title: 'iPhone 15 Pro',
  imageUrl: 'https://example.com/image.jpg',
  price: 999.99,
  status: ProductStatus.ACTIVE,
  productCode: '0000001',
};

const mockCreateDto: CreateOrderDto = {
  items: [{ product: PRODUCT_ID.toString(), amount: 2 }],
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

const mockOrder = {
  _id: new Types.ObjectId(),
  orderId: 'ORD-20240318-ABCDE',
  userId: USER_ID,
  items: [
    {
      product: PRODUCT_ID,
      title: 'iPhone 15 Pro',
      imageUrl: 'https://example.com/image.jpg',
      unitPrice: 999.99,
      amount: 2,
    },
  ],
  amount: 1999.98,
  totalPrice: 1999.98,
  status: OrderStatus.NEW,
  shippingAddress: mockCreateDto.shippingAddress,
  user: mockCreateDto.user,
  payment: { method: PaymentMethod.STRIPE, status: 'NEW' },
  equals: jest.fn(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Mongoose save() lives on the document instance, not the model — we need
// to return an object with save() whenever findOne() should succeed.
function asSaveableDoc<T extends object>(data: T, saveResult?: object): T & { save: jest.Mock } {
  return {
    ...data,
    save: jest.fn().mockResolvedValue(saveResult ?? data),
  } as T & { save: jest.Mock };
}

// ─── Mock models ──────────────────────────────────────────────────────────────

const mockOrderModel = {
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOne_sort: jest.fn(),
};

const mockProductModel = {
  find: jest.fn(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: getModelToken(Product.name), useValue: mockProductModel },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create and return an order with correct amount', async () => {
      mockProductModel.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([mockProduct]) });
      mockOrderModel.create.mockResolvedValue(mockOrder);

      const result = await service.create(mockCreateDto, USER_ID);

      expect(mockProductModel.find).toHaveBeenCalledWith({
        _id: { $in: [PRODUCT_ID] },
        status: ProductStatus.ACTIVE,
      });
      expect(mockOrderModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          amount: 1999.98,
          totalPrice: 1999.98,
          items: expect.arrayContaining([
            expect.objectContaining({ unitPrice: 999.99, amount: 2 }),
          ]),
        }),
      );
      expect(result).toEqual(mockOrder);
    });

    it('should throw BadRequestException when a product is not found', async () => {
      // Returns fewer products than requested — one is missing or inactive.
      mockProductModel.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

      await expect(service.create(mockCreateDto, USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when a product is inactive', async () => {
      // find() filters by ACTIVE so inactive products are excluded by the query.
      // Simulate this by returning an empty array — length mismatch triggers the exception.
      mockProductModel.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

      await expect(service.create(mockCreateDto, USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('should snapshot product title and price into the order item', async () => {
      mockProductModel.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([mockProduct]) });
      mockOrderModel.create.mockResolvedValue(mockOrder);

      await service.create(mockCreateDto, USER_ID);

      const createdWith = mockOrderModel.create.mock.calls[0][0];
      expect(createdWith.items[0].title).toBe(mockProduct.title);
      expect(createdWith.items[0].unitPrice).toBe(mockProduct.price);
    });
  });

  // ─── findMyOrders ─────────────────────────────────────────────────────────

  describe('findMyOrders', () => {
    it('should return orders sorted by createdAt desc for the given user', async () => {
      const chainMock = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockOrder]),
      };
      mockOrderModel.find.mockReturnValue(chainMock);

      const result = await service.findMyOrders(USER_ID);

      expect(mockOrderModel.find).toHaveBeenCalledWith({ userId: USER_ID });
      expect(chainMock.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual([mockOrder]);
    });

    it('should return an empty array when the user has no orders', async () => {
      const chainMock = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      mockOrderModel.find.mockReturnValue(chainMock);

      const result = await service.findMyOrders(USER_ID);

      expect(result).toEqual([]);
    });
  });

  // ─── findMyOrderById ──────────────────────────────────────────────────────

  describe('findMyOrderById', () => {
    it('should return the order when it belongs to the current user', async () => {
      const orderWithUserId = {
        ...mockOrder,
        userId: { equals: (id: Types.ObjectId) => id.equals(USER_ID) },
      };
      const chainMock = { lean: jest.fn().mockResolvedValue(orderWithUserId) };
      mockOrderModel.findOne.mockReturnValue(chainMock);

      const result = await service.findMyOrderById('ORD-20240318-ABCDE', USER_ID);

      expect(mockOrderModel.findOne).toHaveBeenCalledWith({ orderId: 'ORD-20240318-ABCDE' });
      expect(result).toEqual(orderWithUserId);
    });

    it('should throw NotFoundException when the order does not exist', async () => {
      const chainMock = { lean: jest.fn().mockResolvedValue(null) };
      mockOrderModel.findOne.mockReturnValue(chainMock);

      await expect(service.findMyOrderById('ORD-INVALID', USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when the order belongs to another user', async () => {
      const orderWithOtherUser = {
        ...mockOrder,
        userId: { equals: () => false },
      };
      const chainMock = { lean: jest.fn().mockResolvedValue(orderWithOtherUser) };
      mockOrderModel.findOne.mockReturnValue(chainMock);

      await expect(service.findMyOrderById('ORD-20240318-ABCDE', USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── cancelMyOrder ────────────────────────────────────────────────────────

  describe('cancelMyOrder', () => {
    it('should cancel a NEW order and return the updated document', async () => {
      const doc = asSaveableDoc({
        ...mockOrder,
        status: OrderStatus.NEW,
        userId: { equals: (id: Types.ObjectId) => id.equals(USER_ID) },
      });
      mockOrderModel.findOne.mockResolvedValue(doc);

      const result = await service.cancelMyOrder('ORD-20240318-ABCDE', USER_ID);

      expect(doc.status).toBe(OrderStatus.CANCELLED);
      expect(doc.save).toHaveBeenCalled();
      expect(result).toEqual(doc);
    });

    it('should throw NotFoundException when the order does not exist', async () => {
      mockOrderModel.findOne.mockResolvedValue(null);

      await expect(service.cancelMyOrder('ORD-INVALID', USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when the order belongs to another user', async () => {
      const doc = asSaveableDoc({
        ...mockOrder,
        userId: { equals: () => false },
      });
      mockOrderModel.findOne.mockResolvedValue(doc);

      await expect(service.cancelMyOrder('ORD-20240318-ABCDE', USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it.each([OrderStatus.SHIPPING, OrderStatus.CANCELLED, OrderStatus.COMPLETED])(
      'should throw BadRequestException when status is "%s"',
      async (status) => {
        const doc = asSaveableDoc({
          ...mockOrder,
          status,
          userId: { equals: (id: Types.ObjectId) => id.equals(USER_ID) },
        });
        mockOrderModel.findOne.mockResolvedValue(doc);

        await expect(service.cancelMyOrder('ORD-20240318-ABCDE', USER_ID)).rejects.toThrow(
          BadRequestException,
        );
      },
    );
  });

  // ─── updateShippingAddress ────────────────────────────────────────────────

  describe('updateShippingAddress', () => {
    const newAddress: UpdateShippingAddressDto = {
      carrier: ShippingCarrier.NOVA_POST,
      city: 'Lviv',
      branchNumber: '7',
    };

    it('should update the address and return the saved document', async () => {
      const doc = asSaveableDoc({
        ...mockOrder,
        status: OrderStatus.NEW,
        userId: { equals: (id: Types.ObjectId) => id.equals(USER_ID) },
      });
      mockOrderModel.findOne.mockResolvedValue(doc);

      const result = await service.updateShippingAddress('ORD-20240318-ABCDE', USER_ID, newAddress);

      expect(doc.shippingAddress).toEqual(newAddress);
      expect(doc.save).toHaveBeenCalled();
      expect(result).toEqual(doc);
    });

    it('should throw NotFoundException when the order does not exist', async () => {
      mockOrderModel.findOne.mockResolvedValue(null);

      await expect(
        service.updateShippingAddress('ORD-INVALID', USER_ID, newAddress),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when the order belongs to another user', async () => {
      const doc = asSaveableDoc({
        ...mockOrder,
        userId: { equals: () => false },
      });
      mockOrderModel.findOne.mockResolvedValue(doc);

      await expect(
        service.updateShippingAddress('ORD-20240318-ABCDE', USER_ID, newAddress),
      ).rejects.toThrow(ForbiddenException);
    });

    it.each([OrderStatus.SHIPPING, OrderStatus.CANCELLED, OrderStatus.COMPLETED])(
      'should throw BadRequestException when status is "%s"',
      async (status) => {
        const doc = asSaveableDoc({
          ...mockOrder,
          status,
          userId: { equals: (id: Types.ObjectId) => id.equals(USER_ID) },
        });
        mockOrderModel.findOne.mockResolvedValue(doc);

        await expect(
          service.updateShippingAddress('ORD-20240318-ABCDE', USER_ID, newAddress),
        ).rejects.toThrow(BadRequestException);
      },
    );
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated orders sorted by createdAt desc', async () => {
      const chainMock = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockOrder]),
      };
      mockOrderModel.find.mockReturnValue(chainMock);

      const result = await service.findAll(10, 20);

      expect(chainMock.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(chainMock.skip).toHaveBeenCalledWith(20);
      expect(chainMock.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual([mockOrder]);
    });
  });

  // ─── findByUserEmail ──────────────────────────────────────────────────────

  describe('findByUserEmail', () => {
    it('should query by lowercased email and return matching orders', async () => {
      const chainMock = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockOrder]),
      };
      mockOrderModel.find.mockReturnValue(chainMock);

      const result = await service.findByUserEmail('JOHN@EXAMPLE.COM');

      expect(mockOrderModel.find).toHaveBeenCalledWith({
        'user.email': 'john@example.com',
      });
      expect(result).toEqual([mockOrder]);
    });
  });

  // ─── adminCancelOrder ─────────────────────────────────────────────────────

  describe('adminCancelOrder', () => {
    it('should cancel any cancellable order regardless of owner', async () => {
      const doc = asSaveableDoc({ ...mockOrder, status: OrderStatus.NEW });
      mockOrderModel.findOne.mockResolvedValue(doc);

      const result = await service.adminCancelOrder('ORD-20240318-ABCDE');

      expect(doc.status).toBe(OrderStatus.CANCELLED);
      expect(doc.save).toHaveBeenCalled();
      expect(result).toEqual(doc);
    });

    it('should throw NotFoundException when the order does not exist', async () => {
      mockOrderModel.findOne.mockResolvedValue(null);

      await expect(service.adminCancelOrder('ORD-INVALID')).rejects.toThrow(NotFoundException);
    });

    it.each([OrderStatus.SHIPPING, OrderStatus.COMPLETED, OrderStatus.CANCELLED])(
      'should throw BadRequestException when status is "%s"',
      async (status) => {
        const doc = asSaveableDoc({ ...mockOrder, status });
        mockOrderModel.findOne.mockResolvedValue(doc);

        await expect(service.adminCancelOrder('ORD-20240318-ABCDE')).rejects.toThrow(
          BadRequestException,
        );
      },
    );
  });
});
