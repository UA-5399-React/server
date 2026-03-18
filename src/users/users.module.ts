import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose/dist/mongoose.module';

import { User, UserSchema } from '@/users/entities/user.schema';
import { UsersService } from '@/users/users.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  providers: [UsersService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
