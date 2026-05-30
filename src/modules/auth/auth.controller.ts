import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly ACCESS_COOKIE_OPTIONS = {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'strict' as const,
  };

  private readonly REFRESH_COOKIE_OPTIONS = {
    path: '/api/auth',
    httpOnly: true,
    secure: true,
    sameSite: 'strict' as const,
  };

  constructor(private readonly authService: AuthService) {}

  @Post('register-owner')
  @ApiOperation({ summary: 'Register a new organization' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Organization registered successfully' })
  @ApiResponse({ status: 409, description: 'Email or slug already exists' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const ip = req.ip;
    const deviceInfo = this.getDeviceInfo(req);
    const result = await this.authService.register(dto, ip, deviceInfo);
    this.setAuthCookies(reply, result.accessToken, result.refreshToken);
    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        isEmailVerified: result.user.isEmailVerified,
      },
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful (httpOnly cookies set)' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or account locked' })
  @ApiResponse({ status: 403, description: 'Account deactivated' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const ip = req.ip;
    const deviceInfo = this.getDeviceInfo(req);
    const result = await this.authService.login(dto, ip, deviceInfo);
    this.setAuthCookies(reply, result.accessToken, result.refreshToken);
    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        isEmailVerified: result.user.isEmailVerified,
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using cookie' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed (new httpOnly cookies set)' })
  @ApiResponse({ status: 401, description: 'Refresh token missing or invalid' })
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const token = req.cookies?.['refreshToken'];
    if (!token) {
      this.clearAuthCookies(reply);
      throw new UnauthorizedException('Refresh token missing');
    }
    const ip = req.ip;
    const deviceInfo = this.getDeviceInfo(req);
    const result = await this.authService.refresh(token, ip, deviceInfo);
    this.setAuthCookies(reply, result.accessToken, result.refreshToken);
    return { message: 'Tokens refreshed' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout (clears cookies and revokes refresh token)' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const token = req.cookies?.['refreshToken'];
    if (token) {
      await this.authService.logout(token);
    }
    this.clearAuthCookies(reply);
    return { message: 'Logged out successfully' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'Reset link sent (always returns success to prevent email enumeration)' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { message: 'Password has been reset successfully' };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Change current user password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 400, description: 'Current password is incorrect' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(userId, dto);
    return { message: 'Password changed successfully' };
  }

  private setAuthCookies(
    reply: FastifyReply,
    accessToken: string,
    refreshToken: string,
  ) {
    reply.setCookie('accessToken', accessToken, {
      ...this.ACCESS_COOKIE_OPTIONS,
      maxAge: 15 * 60,
    });
    reply.setCookie('refreshToken', refreshToken, {
      ...this.REFRESH_COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60,
    });
  }

  private clearAuthCookies(reply: FastifyReply) {
    reply.clearCookie('accessToken', { path: this.ACCESS_COOKIE_OPTIONS.path });
    reply.clearCookie('refreshToken', { path: this.REFRESH_COOKIE_OPTIONS.path });
  }

  private getDeviceInfo(req: FastifyRequest) {
    const userAgent = req.headers['user-agent'];
    return typeof userAgent === 'string' ? userAgent : undefined;
  }
}
