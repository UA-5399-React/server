import { Field, InputType, PartialType } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';

import { ProductStatus } from '@/products/enums/product-status.enum';
import { CreateProductInput } from '@/products/graphql/create-product.input';

@InputType()
export class UpdateProductInput extends PartialType(CreateProductInput) {
  @Field(() => ProductStatus, { nullable: true })
  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;
}
