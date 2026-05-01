import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

import { ProductImageDto } from './product-image.dto';

const NO_HTML_TAGS = /^(?!.*<\/?[a-zA-Z][^<>]*>)[\s\S]*$/;
const NO_HTML_MESSAGE = { message: '$property must not contain HTML tags' };

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @Matches(NO_HTML_TAGS, NO_HTML_MESSAGE)
  title!: string;

  @IsString()
  @IsOptional()
  @Matches(NO_HTML_TAGS, NO_HTML_MESSAGE)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsString()
  @IsOptional()
  @IsUrl({}, { message: 'imageUrl must be a valid URL' })
  imageUrl?: string;

  @IsString()
  @IsOptional()
  imagePublicId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  @IsOptional()
  additionalImages?: ProductImageDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];
}
