import { Body, Controller, HttpCode, HttpStatus, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { AuthRequest } from '@/auth/types/auth-request.type';

import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { toUserResponseDto } from './users.mapper';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
