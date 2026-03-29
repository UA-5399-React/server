import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

import { UploadedImageFile } from '@/uploads/types/uploaded-image-file.type';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class UploadImageFilePipe implements PipeTransform {
  transform(file: UploadedImageFile) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type "${file.mimetype}". Allowed: jpeg, png, webp`,
      );
    }

    if (file.size > MAX_SIZE) {
      throw new BadRequestException(`File too large. Max size is ${MAX_SIZE / 1024 / 1024}MB`);
    }

    return file;
  }
}
