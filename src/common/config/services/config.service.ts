import { Injectable } from '@nestjs/common';
import { ConfigService as NestJsConfigService } from '@nestjs/config';
import ConfigDTO from '../dto';

@Injectable()
export class ConfigService extends NestJsConfigService<ConfigDTO> {
  constructor() {
    super();
  }

  get IS_PRODUCTION(): boolean {
    return this.get('NODE_ENV', { infer: true }) === 'production';
  }
}
