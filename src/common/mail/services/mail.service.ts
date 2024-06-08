import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendOTPMailToUser(email: string, otp: number) {
    try {
      return await this.mailerService.sendMail({
        to: email,
        subject: 'Welcome to CreatorEvolve App! Confirm your Email',
        template: './email-otp.template.pug',
        context: {
          otp,
        },
      });
    } catch (error) {
      throw new Error(JSON.stringify({ error }));
    }
  }
}
