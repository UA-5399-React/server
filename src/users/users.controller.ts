import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ParseFilePipeBuilder,
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
import type { UploadedImageFile } from '@/uploads/types/uploaded-image-file.type';
import { Role } from '@/users/enums/role.enum';

import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UploadAvatarBodyDto } from './dto/upload-avatar-body.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersListResponseDto } from './dto/users-list-response.dto';
import { UsersQueryDto } from './dto/users-query.dto';
import { toUserResponseDto } from './users.mapper';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadAvatarBodyDto })
  @ApiOkResponse({ type: UserResponseDto })
  @Patch('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Req() req: AuthRequest,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^(image\/jpeg|image\/png|image\/webp)$/,
        })
        .addMaxSizeValidator({
          maxSize: 5 * 1024 * 1024,
        })
        .build({
          fileIsRequired: true,
          errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        }),
    )
    file: UploadedImageFile,
  ): Promise<UserResponseDto> {
    const uploaded = await this.cloudinaryService.uploadAvatar(file, req.user.id);

    const user = await this.usersService.updateAvatar(
      req.user.id,
      uploaded.imageUrl,
      uploaded.imagePublicId,
    );

    return toUserResponseDto(user);
  }
}
