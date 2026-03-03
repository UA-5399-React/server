import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('DB_CONNECTION_LINK');
        const dbName = configService.get<string>('DB_NAME');

        if (!uri) {
          throw new Error('DB_CONNECTION_LINK is not defined in the environment variables');
        }

        if (!dbName) {
          throw new Error('DB_NAME is not defined');
        }

        return {
          uri,
          dbName,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
