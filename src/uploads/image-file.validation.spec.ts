import { FileTypeValidator } from '@nestjs/common';

import { imageFileTypeValidatorOptions } from './image-file.validation';
import type { UploadedImageFile } from './types/uploaded-image-file.type';

describe('imageFileTypeValidatorOptions', () => {
  const validator = new FileTypeValidator(imageFileTypeValidatorOptions);

  it.each(['image/jpeg', 'image/png', 'image/webp'])(
    'accepts %s when magic number detection falls back to the mimetype',
    async (mimetype) => {
      const file = {
        mimetype,
        size: 17,
      } as UploadedImageFile;

      await expect(validator.isValid(file)).resolves.toBe(true);
    },
  );

  it('rejects files outside the allowed image mime types', async () => {
    const file = {
      mimetype: 'text/plain',
      size: 10,
    } as UploadedImageFile;

    await expect(validator.isValid(file)).resolves.toBe(false);
  });
});
