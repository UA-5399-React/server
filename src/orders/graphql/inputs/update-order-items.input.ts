import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

@InputType()
export class UpdateOrderItemInput {
  @Field(() => ID)
  @IsString()
  productId!: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @Field({ nullable: true })
  @IsOptional()
  remove?: boolean;
}

@InputType()
export class UpdateOrderProductsInput {
  @Field(() => String)
  @IsString()
  orderId!: string;

  @Field(() => [UpdateOrderItemInput])
  items!: UpdateOrderItemInput[];
}
