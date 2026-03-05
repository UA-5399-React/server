import { Field, InputType, PartialType } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';

import { CreateProductDto } from '@/products/dto/create-product.dto';
import { ProductStatus } from '@/products/enums/product-status.enum';

@InputType()
export class UpdateProductInput extends PartialType(CreateProductDto) {
  @Field(() => ProductStatus, { nullable: true })
  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;
}
