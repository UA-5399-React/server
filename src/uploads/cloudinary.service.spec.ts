import {
  BadGatewayException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { v2 as cloudinary } from 'cloudinary';
import { Writable } from 'stream';

import { CloudinaryService } from './cloudinary.service';
import { UploadedImageFile } from './types/uploaded-image-file.type';

const mockConfigService = {
  get: jest.fn(),
};

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
    },
  },
}));

const mockConfig = jest.mocked(cloudinary.config);
const mockUploadStream = jest.mocked(cloudinary.uploader.upload_stream);

function makeWritable() {
  return new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
}

describe('CloudinaryService', () => {
  let service: CloudinaryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudinaryService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CloudinaryService>(CloudinaryService);

    mockConfigService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        CLOUDINARY_CLOUD_NAME: 'demo-cloud',
        CLOUDINARY_API_KEY: 'demo-key',
        CLOUDINARY_API_SECRET: 'demo-secret',
        CLOUDINARY_PRODUCTS_FOLDER: 'products',
      };

      return config[key];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('uploads product image and returns metadata', async () => {
    mockUploadStream.mockImplementation(
      (
        _options: unknown,
        callback: (error: unknown, result?: { secure_url: string; public_id: string }) => void,
      ) => {
        const writable = makeWritable();
        setImmediate(() =>
          callback(null, {
            secure_url: 'https://res.cloudinary.com/demo/image/upload/products/sample.png',
            public_id: 'products/sample',
          }),
        );
        return writable;
      },
    );

    const result = await service.uploadProductImage({
      buffer: Buffer.from('image'),
      mimetype: 'image/png',
      size: 5,
    } as UploadedImageFile);

    expect(mockConfig).toHaveBeenCalledWith({
      cloud_name: 'demo-cloud',
      api_key: 'demo-key',
      api_secret: 'demo-secret',
    });
    expect(result).toEqual({
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/products/sample.png',
      imagePublicId: 'products/sample',
    });
  });

  it('throws when file is missing', async () => {
    await expect(service.uploadProductImage(undefined as never)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws when Cloudinary env is missing', async () => {
    mockConfigService.get.mockReturnValue(undefined);

    await expect(
      service.uploadProductImage({
        buffer: Buffer.from('image'),
        mimetype: 'image/png',
        size: 5,
      } as UploadedImageFile),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('throws when Cloudinary upload fails', async () => {
    mockUploadStream.mockImplementation(
      (_options: unknown, callback: (error: unknown, result?: unknown) => void) => {
        const writable = makeWritable();
        setImmediate(() => callback(new Error('cloudinary failure')));
        return writable;
      },
    );

    await expect(
      service.uploadProductImage({
        buffer: Buffer.from('image'),
        mimetype: 'image/png',
        size: 5,
      } as UploadedImageFile),
    ).rejects.toThrow(BadGatewayException);
  });
});
