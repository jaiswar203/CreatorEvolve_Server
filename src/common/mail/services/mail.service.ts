import { MINUTES } from '@/common/constants/time';
import { InquiryTypes } from '@/db/schemas/inquiries/inquiry.schema';
import { MailerService } from '@nestjs-modules/mailer';
import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';

@Injectable()
export class MailService {
  constructor(
    private mailerService: MailerService,
    @InjectQueue('mail') private readonly mailQueue: Queue,
  ) {}

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

  async sendInquiry({
    email,
    subject,
    name,
    type,
  }: {
    email: string;
    name: string;
    subject: string;
    type: InquiryTypes;
  }) {
    try {
      const template =
        type === InquiryTypes.PROFESSIONAL_VOICE_CLONE
          ? './professional-voice-clone-inquiry.template.pug'
          : './professional-voice-clone-inquiry.template.pug';

      await this.mailQueue.add(
        {
          email,
          subject,
          template,
          context: { name },
        },
        { delay: 0 },
      );
      return await this.mailerService.sendMail({
        to: email,
        subject,
        template,
        context: {
          name,
        },
      });
    } catch (error) {
      throw new Error(JSON.stringify({ error }));
    }
  }
}
