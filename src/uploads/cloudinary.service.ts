import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

import { UploadProductImageResponseDto } from './dto/upload-product-image.response.dto';
import { UploadedImageFile } from './types/uploaded-image-file.type';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {}

  async uploadProductImage(file: UploadedImageFile): Promise<UploadProductImageResponseDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Image file is required');
    }

    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    const folder = this.configService.get<string>('CLOUDINARY_PRODUCTS_FOLDER') || 'products';

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException('Cloudinary configuration is missing');
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    return new Promise<UploadProductImageResponseDto>((resolve, reject) => {
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
}
