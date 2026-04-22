import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsUrl } from 'class-validator';

@InputType()
export class ProductImageInput {
  @Field()
  @IsString()
  @IsUrl({}, { message: 'imageUrl must be a valid URL' })
  imageUrl!: string;

  @Field()
  @IsString()
  imagePublicId!: string;
}
