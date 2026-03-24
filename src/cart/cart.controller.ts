import { Body, Controller, Get, Post, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { AuthRequest } from '@/auth/types/auth-request.type';

import { CartService } from './cart.service';
import { CartResponseDto } from './dto/cart-response.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@ApiTags('cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiResponse({ status: 200, type: CartResponseDto })
  async getCart(@Req() req: AuthRequest): Promise<CartResponseDto> {
    return this.cartService.getCart(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiResponse({ status: 200, type: CartResponseDto })
  async updateCart(
    @Req() req: AuthRequest,
    @Body(new ValidationPipe()) updateCartDto: UpdateCartDto,
  ): Promise<CartResponseDto> {
    return this.cartService.updateCart(req.user.id, updateCartDto);
  }
}
