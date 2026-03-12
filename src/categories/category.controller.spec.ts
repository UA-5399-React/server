import { Test, TestingModule } from '@nestjs/testing';

import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

const mockCategory = {
  _id: '1',
  title: 'phone',
  imageUrl: 'example.com',
  description: 'moshi moshi~',
  parent: null,
  depth: 1,
};

const mockCategoryService = {
  findAll: jest.fn(),
};
describe('CategoryController', () => {
  let controller: CategoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        {
          provide: CategoryService,
          useValue: mockCategoryService,
        },
      ],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all existing categories', async () => {
      mockCategoryService.findAll.mockReturnValue([mockCategory]);
      expect(await controller.findAll()).toEqual([mockCategory]);
      expect(mockCategoryService.findAll).toHaveBeenCalled();
    });
  });
});
