import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateCategoryInput {
  @Field()
  @IsString()
  title!: string;

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

  @Field(() => Int)
  @IsIn([1, 2])
  depth!: number;
}
