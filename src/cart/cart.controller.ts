import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { AuthRequest } from '@/auth/types/auth-request.type';

import { CartService } from './cart.service';
import { CartResponseDto } from './dto/cart-response.dto';

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
}
