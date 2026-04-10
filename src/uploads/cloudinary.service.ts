import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

import { UploadImageResponseDto } from './dto/upload-image.response.dto';
import { UploadedImageFile } from './types/uploaded-image-file.type';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {}

  async uploadProductImage(file: UploadedImageFile): Promise<UploadImageResponseDto> {
    const folder = this.configService.get<string>('CLOUDINARY_PRODUCTS_FOLDER') || 'products';

    return this.uploadImage(file, folder);
  }

  async uploadAvatar(file: UploadedImageFile, userId: string): Promise<UploadImageResponseDto> {
    const folder = `avatars/${userId}`;
    return this.uploadImage(file, folder);
  }

  async deleteImage(publicId: string): Promise<void> {
    if (!publicId) {
      return;
    }

    this.configureCloudinary();

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    });

    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new BadGatewayException('Cloudinary image deletion failed');
    }
  }

  private async uploadImage(
    file: UploadedImageFile,
    folder: string,
  ): Promise<UploadImageResponseDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Image file is required');
    }

    this.configureCloudinary();

    return new Promise<UploadImageResponseDto>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            reject(new BadGatewayException('Cloudinary upload failed'));
            return;
          }

          if (!result?.secure_url || !result.public_id) {
            reject(new InternalServerErrorException('Cloudinary response is incomplete'));
            return;
          }

          resolve({
            imageUrl: result.secure_url,
            imagePublicId: result.public_id,
          });
        },
      );

      Readable.from([file.buffer]).pipe(uploadStream);
    });
  }

  private configureCloudinary(): void {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException('Cloudinary configuration is missing');
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }
}
