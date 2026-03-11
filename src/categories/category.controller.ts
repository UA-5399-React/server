import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CategoryService } from './category.service';
import { CategoryResponseDto } from './dto/category-response.dto';

@ApiTags('Category')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all existing categories' })
  @ApiResponse({ status: 200, description: 'Categories list', type: [CategoryResponseDto] })
  findAll() {
    return this.categoryService.findAll();
  }
}
