import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { GqlAuthGuard } from '@/auth/guards/gql-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Role } from '@/users/enums/role.enum';

import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';

describe('UsersResolver', () => {
  let resolver: UsersResolver;
  const mockUsersService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    createByAdmin: jest.fn(),
    updateByAdmin: jest.fn(),
    deleteByAdmin: jest.fn(),
    getStats: jest.fn(),
  };

  type MockUsersService = typeof mockUsersService;

  let usersService: MockUsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersResolver,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(GqlAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<UsersResolver>(UsersResolver);
    usersService = module.get(UsersService);
  });

  describe('users', () => {
    it('should return paginated users', async () => {
      const args = { page: 1, limit: 10 };
      const result = {
        items: [{ id: '1', email: 'test@test.com' }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      usersService.findAll.mockResolvedValue(result as never);

      const actual = await resolver.users(args as never);

      expect(actual).toEqual(result);
      expect(usersService.findAll).toHaveBeenCalledWith(args);
    });
  });

  describe('user', () => {
    it('should return user by id', async () => {
      const user = { id: '123', email: 'test@test.com' };
      usersService.findById.mockResolvedValue(user as never);

      const actual = await resolver.user('123');

      expect(actual).toEqual(user);
      expect(usersService.findById).toHaveBeenCalledWith('123');
    });
  });

  describe('createUser', () => {
    it('should return created user payload', async () => {
      const input = {
        email: 'new@test.com',
        role: Role.ADMIN,
      };
      const currentUser = {
        id: 'admin-id',
        role: Role.SUPER_ADMIN,
        email: 'admin@test.com',
      };
      const serviceResult = {
        user: { id: '1', email: 'new@test.com' },
        tempPassword: 'temp123',
      };

      usersService.createByAdmin.mockResolvedValue(serviceResult as never);

      const actual = await resolver.createUser(input as never, currentUser as never);

      expect(actual).toEqual(serviceResult);
      expect(usersService.createByAdmin).toHaveBeenCalledWith(input, currentUser);
    });
  });

  describe('updateUser', () => {
    it('should return updated user', async () => {
      const input = { id: '1', firstName: 'Anna' };
      const currentUser = {
        id: 'admin-id',
        role: Role.SUPER_ADMIN,
        email: 'admin@test.com',
      };
      const updatedUser = { id: '1', firstName: 'Anna' };

      usersService.updateByAdmin.mockResolvedValue(updatedUser as never);

      const actual = await resolver.updateUser(input as never, currentUser as never);

      expect(actual).toEqual(updatedUser);
      expect(usersService.updateByAdmin).toHaveBeenCalledWith(input, currentUser);
    });
  });

  describe('deleteUser', () => {
    it('should call deleteByAdmin and return boolean', async () => {
      const targetId = '1';
      const currentUser = {
        id: 'admin-id',
        role: Role.SUPER_ADMIN,
        email: 'admin@test.com',
      };

      usersService.deleteByAdmin.mockResolvedValue(true as never);

      const actual = await resolver.deleteUser(targetId, currentUser as never);

      expect(actual).toBe(true);
      expect(usersService.deleteByAdmin).toHaveBeenCalledWith(targetId, currentUser);
    });
  });

  describe('createdBy', () => {
    it('should return null when createdBy is missing', async () => {
      const user = { createdBy: null };

      const result = await resolver.createdBy(
        user as never,
        {
          userById: { load: jest.fn() },
        } as never,
      );

      expect(result).toBeNull();
    });

    it('should load creator by id when createdBy exists', async () => {
      const creatorId = new Types.ObjectId();
      const creator = { id: creatorId.toString(), email: 'creator@test.com' };
      const load = jest.fn().mockResolvedValue(creator);

      const user = { createdBy: creatorId };

      const result = await resolver.createdBy(
        user as never,
        {
          userById: { load },
        } as never,
      );

      expect(result).toEqual(creator);
      expect(load).toHaveBeenCalledWith(creatorId.toString());
    });
  });

  describe('userStats', () => {
    it('should return stats', async () => {
      const stats = {
        totalUsers: 10,
        activeUsers: 7,
        blockedUsers: 3,
      };

      usersService.getStats.mockResolvedValue(stats);

      const actual = await resolver.userStats();

      expect(actual).toEqual(stats);
      expect(usersService.getStats).toHaveBeenCalled();
    });
  });
});
