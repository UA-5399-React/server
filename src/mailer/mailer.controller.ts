import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { Roles } from '@/auth/decorators/Roles';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Role } from '@/users/enums/role.enum';

import { MailService } from './mailer.service';

@Controller('mail')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('test')
  async sendTest(@Query('to') to: string) {
    return this.mailService.sendTestEmail(to);
  }
}
