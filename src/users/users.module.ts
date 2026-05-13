import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CryptoModule } from '@/auth/crypto/crypto.module';
import { TokensModule } from '@/auth/tokens/tokens.module';
import { CartModule } from '@/cart/cart.module';
import { MailModule } from '@/mailer/mailer.module';
import { Product, ProductSchema } from '@/products/entities/product.schema';
import { UploadsModule } from '@/uploads/uploads.module';
import { User, UserSchema } from '@/users/entities/user.schema';
import { UsersController } from '@/users/users.controller';
import { UsersResolver } from '@/users/users.resolver';
import { UsersService } from '@/users/users.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    CryptoModule,
    UploadsModule,
    TokensModule,
    CartModule,
    MailModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersResolver],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
