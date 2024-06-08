import { Body, Controller, Post } from '@nestjs/common';
import { UserDto } from '../dto/user.request.dto';
import { UserService } from '../services/user.service';
import { Serialize } from 'interceptors/serialize.interceptor';
import { UserResponseDto } from '../dto/user.response.dto';

@Controller({
  path: 'users',
  version: '1',
})
@Serialize(UserResponseDto)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async createUser(@Body() body: UserDto) {
    return this.userService.create(body);
  }
}
