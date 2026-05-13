import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '@/auth/decorators/Roles';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import type { AuthRequest } from '@/auth/types/auth-request.type';
import { CloudinaryService } from '@/uploads/cloudinary.service';
import { createImageFileParsePipe } from '@/uploads/image-file.validation';
import type { UploadedImageFile } from '@/uploads/types/uploaded-image-file.type';
import { Role } from '@/users/enums/role.enum';

import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UploadAvatarBodyDto } from './dto/upload-avatar-body.dto';
import { UpsertWishlistItemDto } from './dto/upsert-wishlist-item.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersListResponseDto } from './dto/users-list-response.dto';
import { UsersQueryDto } from './dto/users-query.dto';
import { UserDocument } from './entities/user.schema';
import { toUserListResponseDto, toUserResponseDto } from './users.mapper';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private async toUserResponseDtoActiveWishlist(user: UserDocument): Promise<UserResponseDto> {
    return toUserResponseDto(await this.usersService.withActiveWishlistOnly(user));
  }

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
      items: result.items.map(toUserListResponseDto),
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: UserResponseDto })
  @Get('me')
  async getMe(@Req() req: AuthRequest): Promise<UserResponseDto> {
    const user = await this.usersService.findById(req.user.id);
    return this.toUserResponseDtoActiveWishlist(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: UserResponseDto })
  @Patch('me')
  async updateMe(@Req() req: AuthRequest, @Body() dto: UpdateMeDto): Promise<UserResponseDto> {
    const user = await this.usersService.updateMe(req.user.id, dto);
    return this.toUserResponseDtoActiveWishlist(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Password changed successfully' })
  @Patch('me/password')
  async changePassword(@Req() req: AuthRequest, @Body() dto: ChangePasswordDto): Promise<void> {
    await this.usersService.changePassword(req.user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: UserResponseDto })
  @Patch('me/wishlist')
  async upsertWishlistItem(
    @Req() req: AuthRequest,
    @Body() dto: UpsertWishlistItemDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.upsertWishlistItem(req.user.id, dto);
    return this.toUserResponseDtoActiveWishlist(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: UserResponseDto })
  @Delete('me/wishlist/:productId')
  async removeWishlistItem(
    @Req() req: AuthRequest,
    @Param('productId') productId: string,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.removeWishlistItem(req.user.id, productId);
    return this.toUserResponseDtoActiveWishlist(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: UserResponseDto })
  @Delete('me/wishlist')
  async clearWishlist(@Req() req: AuthRequest): Promise<UserResponseDto> {
    const user = await this.usersService.clearWishlist(req.user.id);
    return this.toUserResponseDtoActiveWishlist(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadAvatarBodyDto })
  @ApiOkResponse({ type: UserResponseDto })
  @Patch('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Req() req: AuthRequest,
    @UploadedFile(createImageFileParsePipe())
    file: UploadedImageFile,
  ): Promise<UserResponseDto> {
    const uploaded = await this.cloudinaryService.uploadAvatar(file, req.user.id);

    const user = await this.usersService.updateAvatar(
      req.user.id,
      uploaded.imageUrl,
      uploaded.imagePublicId,
    );

    return this.toUserResponseDtoActiveWishlist(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'User deleted successfully' })
  @Delete(':id')
  async deleteUser(@Param('id') id: string, @Req() req: AuthRequest): Promise<void> {
    await this.usersService.deleteByAdmin(id, req.user);
  }
}
