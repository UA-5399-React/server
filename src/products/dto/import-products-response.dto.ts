import { ApiProperty } from '@nestjs/swagger';

export class ImportFailedRowDto {
  @ApiProperty({ example: 2 })
  row: number;

  @ApiProperty({ example: 'Missing required field: price' })
  reason: string;
}

export class ImportProductsResponseDto {
  @ApiProperty({ example: 5 })
  imported: number;

  @ApiProperty({ type: [ImportFailedRowDto] })
  failed: ImportFailedRowDto[];
}
