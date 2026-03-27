import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CryptoModule } from '@/auth/crypto/crypto.module';
import { UploadsModule } from '@/uploads/uploads.module';
import { User, UserSchema } from '@/users/entities/user.schema';
import { UsersController } from '@/users/users.controller';
import { UsersResolver } from '@/users/users.resolver';
import { UsersService } from '@/users/users.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    CryptoModule,
    UploadsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersResolver],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
