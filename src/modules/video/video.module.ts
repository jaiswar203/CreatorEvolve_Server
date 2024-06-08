import { Module } from '@nestjs/common';
import { VideoController } from './controller/video.controller';
import { VideoService } from './services/video.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Video, VideoSchema } from '@/schemas/videos/video.schema';
import { TwelveLabsModule } from 'libs/twelvelabs/twelvelabs.module';
import { User, UserSchema } from '@/schemas/users/user.schema';
import { TLIndex, TLIndexSchema } from '@/schemas/services/tl.index.schema';
import { UserService } from '@/modules/user/services/user.service';
import { UserModule } from '@/modules/user/user.module';
import { Role, RoleSchema } from '@/schemas/users/role.schema';
import {
  Permission,
  PermissionSchema,
} from '@/schemas/users/permission.schema';
import { JwtService } from '@nestjs/jwt';
import { StorageModule } from '@/common/storage/storage.module';
import { VideoProcessorService } from './services/processor.service';
import { OpenAIModule } from 'libs/openai/openai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Video.name, schema: VideoSchema },
      { name: User.name, schema: UserSchema },
      { name: TLIndex.name, schema: TLIndexSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Permission.name, schema: PermissionSchema },
    ]),
    TwelveLabsModule,
    UserModule,
    StorageModule,
    OpenAIModule
  ],
  controllers: [VideoController],
  providers: [
    VideoService,
    UserService,
    JwtService,
    VideoProcessorService,
  ],
  exports: [VideoService],
})
export class VideoModule {}
