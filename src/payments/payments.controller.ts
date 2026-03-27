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
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a Stripe Checkout Session' })
  @ApiBody({ type: CreateCheckoutSessionDto })
  @ApiResponse({
    status: 200,
    description: 'Checkout session created',
    schema: {
      properties: {
        sessionId: { type: 'string', example: 'cs_test_a1b2c3...' },
        sessionUrl: { type: 'string', example: 'https://checkout.stripe.com/c/pay/cs_test_...' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createCheckoutSession(
    @Body() dto: CreateCheckoutSessionDto,
  ): Promise<{ sessionId: string; sessionUrl: string }> {
    const successUrl =
      this.configService.get<string>('STRIPE_SUCCESS_URL') ||
      'http://localhost:5173/order-confirmation';
    const cancelUrl =
      this.configService.get<string>('STRIPE_CANCEL_URL') || 'http://localhost:5173/cart';

    return this.paymentsService.createCheckoutSession(
      dto.items,
      successUrl,
      cancelUrl,
      dto.orderId,
    );
  }

  @Get('session/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get Stripe Checkout Session status' })
  @ApiParam({ name: 'sessionId', description: 'Stripe session ID', example: 'cs_test_a1b2c3...' })
  @ApiResponse({
    status: 200,
    description: 'Session status',
    schema: {
      properties: {
        status: { type: 'string', example: 'complete' },
        paymentStatus: { type: 'string', example: 'paid' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSessionStatus(
    @Param('sessionId') sessionId: string,
  ): Promise<{ status: string; paymentStatus: string }> {
    return this.paymentsService.getSessionStatus(sessionId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed',
    schema: { properties: { received: { type: 'boolean', example: true } } },
  })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!req.rawBody) {
      throw new BadRequestException('Missing raw body for webhook verification');
    }

    const event = this.paymentsService.constructWebhookEvent(req.rawBody, signature);

    await this.paymentsService.handleWebhookEvent(event);

    return { received: true };
  }
}
