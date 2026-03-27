import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

@InputType()
export class UpdateOrderItemInput {
  @Field(() => String)
  @IsString()
  productId!: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  remove?: boolean;
}

@InputType()
export class UpdateOrderProductsInput {
  @Field(() => String)
  @IsString()
  orderId!: string;

  @Field(() => [UpdateOrderItemInput])
  @ValidateNested({ each: true })
  @Type(() => UpdateOrderItemInput)
  items!: UpdateOrderItemInput[];
}
