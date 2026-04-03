import { HttpStatus, ParseFilePipeBuilder } from '@nestjs/common';

export const IMAGE_MIME_TYPE_PATTERN = /^image\/(jpeg|png|webp)$/;
export const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;

export const imageFileTypeValidatorOptions = {
  fileType: IMAGE_MIME_TYPE_PATTERN,
  fallbackToMimetype: true,
};

export const createImageFileParsePipe = () =>
  new ParseFilePipeBuilder()
    .addFileTypeValidator(imageFileTypeValidatorOptions)
    .addMaxSizeValidator({ maxSize: MAX_IMAGE_FILE_SIZE })
    .build({
      fileIsRequired: true,
      errorHttpStatusCode: HttpStatus.BAD_REQUEST,
    });
