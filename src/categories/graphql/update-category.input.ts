import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsOptional, IsString } from 'class-validator';

@InputType()
export class UpdateCategoryInput {
  @Field(() => ID)
  @IsString()
  _id!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  parent?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsIn([1, 2])
  depth?: number;
}
