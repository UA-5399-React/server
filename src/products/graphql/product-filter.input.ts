import { Field, Float, GraphQLISODateTime, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { ProductStatus } from '@/products/enums/product-status.enum';
@InputType()
export class ProductsFilterInput {
  @Field(() => [String], { nullable: true, description: 'Exact match in tags[]' })
  @IsOptional()
  @IsString({ each: true })
  category?: string[];

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @Field(() => [ProductStatus], { nullable: true })
  @IsOptional()
  @IsEnum(ProductStatus, { each: true })
  status?: ProductStatus[];

  @Field(() => GraphQLISODateTime, { nullable: true, description: 'updatedAt >= updatedFrom' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  updatedFrom?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true, description: 'updatedAt <= updatedTo' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  updatedTo?: Date;

  @Field(() => String, { nullable: true, description: 'by what field to sort' })
  @IsOptional()
  @Type(() => String)
  dateType?: 'createdAt' | 'updatedAt';
}
