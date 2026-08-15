import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

/** Shared SMTP sender — imported by any module that sends mail (users, support). */
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
