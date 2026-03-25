import {
  Controller,
  HttpCode,
  HttpStatus,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CloudinaryService } from './cloudinary.service';
import { UploadImageResponseDto } from './dto/upload-image.response.dto';
import { UploadProductImageBodyDto } from './dto/upload-product-image-body.dto';
import type { UploadedImageFile } from './types/uploaded-image-file.type';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('products')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload product image to Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadProductImageBodyDto })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
    type: UploadImageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 500, description: 'Cloudinary configuration is missing' })
  @ApiResponse({ status: 502, description: 'Cloudinary upload failed' })
  uploadProductImage(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^(image\/jpeg|image\/png|image\/webp)$/ })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({ fileIsRequired: true, errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    file: UploadedImageFile,
  ): Promise<UploadImageResponseDto> {
    return this.cloudinaryService.uploadProductImage(file);
  }
}
