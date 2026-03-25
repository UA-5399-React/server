import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Roles } from '@/auth/decorators/Roles';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import type { AuthRequest } from '@/auth/types/auth-request.type';
import { Role } from '@/users/enums/role.enum';

import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersListResponseDto } from './dto/users-list-response.dto';
import { UsersQueryDto } from './dto/users-query.dto';
import { toUserResponseDto } from './users.mapper';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiOkResponse({ type: UsersListResponseDto })
  @Get()
  async getUsers(@Query() query: UsersQueryDto): Promise<UsersListResponseDto> {
    let isActive: boolean | undefined;

    if (query.status === 'active') {
      isActive = true;
    } else if (query.status === 'blocked') {
      isActive = false;
    }

    const result = await this.usersService.findAll({
      search: query.search,
      page: query.page,
      limit: query.limit,
      filter: {
        role: query.role,
        isActive,
      },
    });

    return {
      ...result,
      items: result.items.map(toUserResponseDto),
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: UserResponseDto })
  @Get('me')
  async getMe(@Req() req: AuthRequest): Promise<UserResponseDto> {
    const user = await this.usersService.findById(req.user.id);
    return toUserResponseDto(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: UserResponseDto })
  @Patch('me')
  async updateMe(@Req() req: AuthRequest, @Body() dto: UpdateMeDto): Promise<UserResponseDto> {
    const user = await this.usersService.updateMe(req.user.id, dto);
    return toUserResponseDto(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Password changed successfully' })
  @Patch('me/password')
  async changePassword(@Req() req: AuthRequest, @Body() dto: ChangePasswordDto): Promise<void> {
    await this.usersService.changePassword(req.user.id, dto);
  }
}
