import { Type } from '@nestjs/common';
import { Field, Int, ObjectType } from '@nestjs/graphql';

export function PaginatedResponse<TItem>(classRef: Type<TItem>) {
  @ObjectType(`${classRef.name}Page`)
  abstract class PaginatedResponseClass {
    @Field(() => [classRef])
    items!: TItem[];

    @Field(() => Int)
    total!: number;

    @Field(() => Int)
    page!: number;

    @Field(() => Int)
    limit!: number;

    @Field(() => Int)
    totalPages!: number;
  }

  return PaginatedResponseClass;
}
