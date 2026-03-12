import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AuthModule } from '@/auth/auth.module';
import { AppGraphQLModule } from '@/graphql/graphql.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestLoggingInterceptor } from './common/request-logging.interceptor';
import { DatabaseModule } from './database/database.module';
import { ProductSeeder } from './database/seeders/product.seeder';
import { LoggerModule } from './logger/logger.module';
import { ProductsModule } from './products/products.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule,
    DatabaseModule,
    ProductsModule,
    UploadsModule,
    AppGraphQLModule,
    AuthModule,
  ],
  controllers: [AppController],
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
