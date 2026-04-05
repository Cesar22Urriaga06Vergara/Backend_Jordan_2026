import { Controller, Get, Param, Body, Patch, Post, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Roles('ADMIN')
  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Roles('ADMIN')
  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.usersService.findAll(parseInt(page), parseInt(limit));
  }

  @Get('profile')
  async getProfile(@CurrentUser() user: any) {
    return this.usersService.findById(user.id);
  }

  @Roles('ADMIN')
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.usersService.findById(Number(id));
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: any,
    @Body() updateData: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, updateData);
  }

  @Patch('change-password')
  async changePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }
}
