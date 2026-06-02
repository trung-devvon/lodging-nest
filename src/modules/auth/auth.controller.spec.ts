import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const authService = {
    forgotPassword: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerificationEmail: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('forwards verify email requests to AuthService', async () => {
    authService.verifyEmail.mockResolvedValue({
      message: 'Email has been verified successfully',
    });

    await expect(
      controller.verifyEmail({ token: 'verify-token' }),
    ).resolves.toEqual({
      message: 'Email has been verified successfully',
    });

    expect(authService.verifyEmail).toHaveBeenCalledWith('verify-token');
  });

  it('forwards resend verification requests to AuthService', async () => {
    authService.resendVerificationEmail.mockResolvedValue({
      message: 'If the email exists, a verification link has been sent',
    });

    await expect(
      controller.resendVerificationEmail({ email: 'owner@example.com' }),
    ).resolves.toEqual({
      message: 'If the email exists, a verification link has been sent',
    });

    expect(authService.resendVerificationEmail).toHaveBeenCalledWith(
      'owner@example.com',
    );
  });
});
