import { Controller, Get, Patch, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
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
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid-001',
          email: 'owner@annhien.com',
          phone: '0901234567',
          role: 'ORG_OWNER',
          isEmailVerified: true,
          twoFactorEnabled: false,
          createdAt: '2025-01-15T08:00:00.000Z',
        },
      },
    },
  })
  async getMe(@CurrentUser('id') userId: string) {
    return this.usersService.getMe(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Profile updated',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid-001',
          email: 'owner@annhien.com',
          phone: '0909999888',
        },
      },
    },
  })
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateMe(userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'List all users (Admin only)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'role', required: false, example: 'ORG_OWNER' })
  @ApiQuery({ name: 'search', required: false, example: 'nguyen' })
  @ApiQuery({ name: 'isActive', required: false, example: true })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of users',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'uuid-001',
            email: 'owner@annhien.com',
            phone: '0901234567',
            role: 'ORG_OWNER',
            isActive: true,
            createdAt: '2025-01-15T08:00:00.000Z',
          },
        ],
        meta: {
          total: 45,
          page: 1,
          limit: 20,
        },
      },
    },
  })
  async findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Patch(':id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Activate/deactivate user (Admin only)' })
  @ApiParam({ name: 'id', example: 'uuid-001' })
  @ApiBody({ type: ToggleActiveDto })
  @ApiResponse({
    status: 200,
    description: 'User status updated',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid-001',
          isActive: false,
        },
      },
    },
  })
  async toggleActive(
    @Param('id') id: string,
    @Body() dto: ToggleActiveDto,
  ) {
    return this.usersService.toggleActive(id, dto);
  }
}
