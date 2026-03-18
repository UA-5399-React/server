import { Module } from '@nestjs/common';

import { CryptoService } from '@/auth/crypto/crypto.service';

@Module({
  providers: [CryptoService],
  exports: [CryptoService],
})
export class CryptoModule {}
