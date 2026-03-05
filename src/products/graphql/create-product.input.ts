import { Field, Float, InputType } from '@nestjs/graphql';
import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

import { Trim } from '@/common/decorators/trim.decorator';
import { NormalizeStringArray } from '@/common/decorators/trim-array.decorator';

@InputType()
export class CreateProductInput {
  @Field()
  @Trim()
  @IsString()
  @IsNotEmpty()
  title: string;

  @Field({ nullable: true })
  @Trim()
  @IsString()
  @IsOptional()
  description?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @Field({ nullable: true })
  @Trim()
  @IsString()
  @IsOptional()
  @IsUrl({}, { message: 'imageUrl must be a valid URL' })
  imageUrl?: string;

  @Field(() => [String], { nullable: true })
  @NormalizeStringArray()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ArrayUnique()
  categories?: string[];
}
