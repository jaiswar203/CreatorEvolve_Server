import { ROLE } from '@/common/constants/roles.enum';
import { Roles } from '@/common/decorators/role.decorator';
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AppService } from './app.service';
import { v4 as uuidv4 } from 'uuid';

@Controller('/')
export class AppController {
  constructor(private appService: AppService) {}

  @Post('/upload')
  @Roles(ROLE.USER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async uploadFIle(@UploadedFile() file: Express.Multer.File) {
    const modifiedFilename = `${uuidv4()}-${file.originalname}`;

    file.filename = modifiedFilename;
    return this.appService.uploadFile(file);
  }
}
