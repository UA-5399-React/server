import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class UpsertWishlistItemDto {
  @ApiProperty({ example: '66124560cceb1a2a6c8f61c3' })
  @IsString()
  @IsOptional()
  @IsMongoId()
  productId!: string;
}
