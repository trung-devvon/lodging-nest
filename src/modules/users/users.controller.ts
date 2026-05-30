import { Controller, Get, Patch, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { ToggleActiveDto } from './dto/toggle-active.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.usersService.getMe(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateMe(userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  async findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Patch(':id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate/deactivate user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User status updated' })
  async toggleActive(
    @Param('id') id: string,
    @Body() dto: ToggleActiveDto,
  ) {
    return this.usersService.toggleActive(id, dto);
  }
}
