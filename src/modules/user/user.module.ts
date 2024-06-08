import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '@/schemas/users/user.schema';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { Role, RoleSchema } from '@/schemas/users/role.schema';
import { Permission, PermissionSchema } from '@/schemas/users/permission.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Permission.name, schema: PermissionSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
