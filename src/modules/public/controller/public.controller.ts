import { ConfigService } from '@/common/config/services/config.service';
import { LoggerService } from '@/common/logger/services/logger.service';
import {
  Body,
  Controller,
  Req,
  Headers,
  Post,
  RawBodyRequest,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { TWelveLabsTaskStatusDto } from '../dto/twelvelabs.webhook.dto';
import { PublicService } from '../services/public.service';

@Controller('public')
export class PublicController {
  constructor(
    private loggerService: LoggerService,
    private configService: ConfigService,
    private publicService: PublicService,
  ) {}

  @Post('/tl-task-status')
  async tlTaskStatus(
    @Body() body: TWelveLabsTaskStatusDto,
    @Headers('tl-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    // if (!signature) {
    //   throw new BadRequestException('Missing TL-Signature header');
    // }

    // const [tField, v1Field] = signature
    //   .split(',')
    //   .map((part) => part.split('=')[1]);
    // const timestamp = tField;
    // const providedSignature = v1Field;

    // const rawBody = req.rawBody;
    // const signedPayload = `${timestamp}.${rawBody}`;
    // const generatedSignature = crypto
    //   .createHmac(
    //     'sha256',
    //     this.configService.get('TWELVE_LABS_SIGNING_SECRET'),
    //   )
    //   .update(signedPayload)
    //   .digest('hex');

    // this.loggerService.log(
    //   JSON.stringify({
    //     generatedSignature,
    //     providedSignature,
    //   }),
    // );

    // if (generatedSignature !== providedSignature) {
    //   this.loggerService.warn('Invalid signature');
    //   throw new UnauthorizedException('Invalid signature');
    // }

    this.loggerService.log(
      JSON.stringify({
        message: 'Status Received from the TL labs',
        data: body,
      }),
    );

    return await this.publicService.tlTaskStatus(body);
  }
}
