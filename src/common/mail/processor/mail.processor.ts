import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { MailerService } from '@nestjs-modules/mailer';

@Processor('mail')
export class MailProcessor {
  constructor(private readonly mailerService: MailerService) {}

  @Process()
  async handleSendMail(job: Job) {
    const { email, subject, template, context } = job.data;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject,
        template,
        context,
      });
    } catch (error) {
      throw new Error(JSON.stringify({ error }));
    }
  }
}
