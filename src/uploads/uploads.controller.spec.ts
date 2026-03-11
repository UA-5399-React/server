import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CloudinaryService } from './cloudinary.service';
import { UploadedImageFile } from './types/uploaded-image-file.type';
import { UploadsController } from './uploads.controller';

const mockCloudinaryService = {
  uploadProductImage: jest.fn(),
};

describe('UploadsController', () => {
  let controller: UploadsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadsController],
      providers: [
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
      ],
    }).compile();

    controller = module.get<UploadsController>(UploadsController);
  });

  afterEach(() => jest.clearAllMocks());

  it('returns uploaded image metadata', async () => {
    const file = {
      buffer: Buffer.from('file'),
      mimetype: 'image/png',
      size: 4,
    } as UploadedImageFile;
    const uploaded = {
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/products/sample.png',
      imagePublicId: 'products/sample',
    };

    mockCloudinaryService.uploadProductImage.mockResolvedValue(uploaded);

    await expect(controller.uploadProductImage(file)).resolves.toEqual(uploaded);
    expect(mockCloudinaryService.uploadProductImage).toHaveBeenCalledWith(file);
  });

  it('propagates upload errors', async () => {
    const file = {
      buffer: Buffer.from('file'),
      mimetype: 'image/png',
      size: 4,
    } as UploadedImageFile;

    mockCloudinaryService.uploadProductImage.mockRejectedValue(
      new BadRequestException('Invalid image'),
    );

    await expect(controller.uploadProductImage(file)).rejects.toThrow(BadRequestException);
  });
});
