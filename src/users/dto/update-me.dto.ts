import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  lastName?: string;

  @ApiPropertyOptional({ example: '+380991112233 ' })
  @IsOptional()
  @IsString()
  @Length(7, 20)
  @Matches(/^\+?[0-9()\-\s]+$/, {
    message: 'phone format is invalid',
  })
  phone?: string;
}
