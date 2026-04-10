import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '@/auth/decorators/Roles';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Role } from '@/users/enums/role.enum';

import { ImportProductsResponseDto } from './dto/import-products-response.dto';
import { ProductsImportService } from './products-import.service';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@ApiTags('Admin / Products')
@Controller('admin/products')
export class ProductsAdminController {
  constructor(private readonly productsImportService: ProductsImportService) {}

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Bulk-import products from an .xlsx or .csv file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel (.xlsx) or CSV (.csv) file',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 200, type: ImportProductsResponseDto })
  @ApiResponse({ status: 400, description: 'Unsupported file format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – admin role required' })
  async importProducts(
    @UploadedFile() file: { originalname: string; buffer: Buffer } | undefined,
  ): Promise<ImportProductsResponseDto> {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded. Attach a .xlsx or .csv file in the "file" field.',
      );
    }
    return this.productsImportService.importFromFile(file);
  }
}
