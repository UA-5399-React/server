import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestLoggingInterceptor } from './common/request-logging.interceptor';
import { DatabaseModule } from './database/database.module';
import { LoggerModule } from './logger/logger.module';
import { ProductsController } from './products/products.controller';
import { ProductsModule } from './products/products.module';
import { ProductSeeder } from './database/seeders/product.seeder';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      path: 'graphql',
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
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
