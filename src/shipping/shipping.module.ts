import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 8000,
      maxRedirects: 3,
    }),
  ],
  controllers: [ShippingController],
  providers: [ShippingService],
})
export class ShippingModule {}
