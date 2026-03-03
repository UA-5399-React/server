import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { LoggerModule } from './logger/logger.module';
import { RequestLoggingInterceptor } from './common/request-logging.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ProductsController } from './products/products.controller';
import { ProductSeeder } from './database/seeders/product.seeder';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule,
    DatabaseModule,
    ProductsModule,
  ],
  controllers: [AppController, ProductsController],
  providers: [
    AppService,
    ProductSeeder,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
  ],
})
export class AppModule {}
