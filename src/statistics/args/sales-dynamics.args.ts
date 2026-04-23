import { ArgsType, Field, ID } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDate, IsEnum } from 'class-validator';

import { GroupBy } from '../enums/group-by.enum';

@ArgsType()
export class SalesDynamicsArgs {
  @Field(() => [ID], { description: 'One or two product IDs to compare' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  productIds!: string[];

  @Field(() => Date)
  @IsDate()
  @Type(() => Date)
  from!: Date;

  @Field(() => Date)
  @IsDate()
  @Type(() => Date)
  to!: Date;

  @Field(() => GroupBy)
  @IsEnum(GroupBy)
  groupBy!: GroupBy;
}
