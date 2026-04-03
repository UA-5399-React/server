import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { redisStore } from 'cache-manager-redis-yet';

import { AuthModule } from '@/auth/auth.module';
import { CartModule } from '@/cart/cart.module';
import { AppGraphQLModule } from '@/graphql/graphql.module';
import { UsersModule } from '@/users/users.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategoryModule } from './categories/category.module';
import { RequestLoggingInterceptor } from './common/request-logging.interceptor';
import { DatabaseModule } from './database/database.module';
import { LoggerModule } from './logger/logger.module';
import { MailModule } from './mailer/mailer.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ProductsModule } from './products/products.module';
import { ShippingModule } from './shipping/shipping.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (config: ConfigService) => ({
        store: redisStore,
        socket: {
          host: config.getOrThrow('REDIS_HOST'),
          port: config.getOrThrow<number>('REDIS_PORT'),
        },
        password: config.getOrThrow('REDIS_PASSWORD'),
        ttl: 60 * 60 * 1000,
      }),
      inject: [ConfigService],
    }),
    LoggerModule,
    DatabaseModule,
    ProductsModule,
    CategoryModule,
    UploadsModule,
    AppGraphQLModule,
    AuthModule,
    OrdersModule,
    UsersModule,
    ShippingModule,
    CartModule,
    MailModule,
    PaymentsModule,
    NewsletterModule,
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
