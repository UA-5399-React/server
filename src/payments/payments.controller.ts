import type { RawBodyRequest } from '@nestjs/common';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a Stripe Checkout Session' })
  @ApiResponse({ status: 200, description: 'Checkout session created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createCheckoutSession(
    @Body() dto: CreateCheckoutSessionDto,
  ): Promise<{ sessionId: string; sessionUrl: string }> {
    const successUrl = process.env.STRIPE_SUCCESS_URL || 'http://localhost:5173/order-confirmation';
    const cancelUrl = process.env.STRIPE_CANCEL_URL || 'http://localhost:5173/cart';

    return this.paymentsService.createCheckoutSession(dto.items, successUrl, cancelUrl);
  }

  @Get('session/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get Stripe Checkout Session status' })
  @ApiParam({ name: 'sessionId', description: 'Stripe session ID' })
  @ApiResponse({ status: 200, description: 'Session status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSessionStatus(
    @Param('sessionId') sessionId: string,
  ): Promise<{ status: string; paymentStatus: string }> {
    return this.paymentsService.getSessionStatus(sessionId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!req.rawBody) {
      throw new BadRequestException('Missing raw body for webhook verification');
    }

    const event = this.paymentsService.constructWebhookEvent(req.rawBody, signature);

    this.paymentsService.handleWebhookEvent(event);

    return { received: true };
  }
}
