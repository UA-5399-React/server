import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AppGraphQLModule } from '@/graphql/graphql.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategoryModule } from './categories/category.module';
import { RequestLoggingInterceptor } from './common/request-logging.interceptor';
import { DatabaseModule } from './database/database.module';
import { LoggerModule } from './logger/logger.module';
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
    CategoryModule,
    AppGraphQLModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
  ],
})
export class AppModule {}
