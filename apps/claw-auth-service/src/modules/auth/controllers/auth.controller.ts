import { Body, Controller, Get, HttpCode, HttpStatus, Post, UsePipes } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { Public } from '../../../app/decorators/public.decorator';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { LoginDto, loginSchema, loginSessionClient } from '../dto/login.dto';
import { RegisterDto, registerSchema } from '../dto/register.dto';
import { RefreshTokenDto, refreshTokenSchema } from '../dto/refresh-token.dto';
import { PasswordResetService } from '../services/password-reset.service';
import {
  ConfirmPasswordResetDto,
  confirmPasswordResetSchema,
  RequestPasswordResetDto,
  requestPasswordResetSchema,
} from '../dto/password-reset.dto';
import { AuthenticatedUser } from '../../../common/types';
import { LoginResult, RefreshResult, RegisterResult, UserProfile } from '../types/auth.types';
import { EmailVerificationService } from '../services/email-verification.service';
import {
  ResendVerificationDto,
  resendVerificationSchema,
  VerifyEmailDto,
  verifyEmailSchema,
} from '../dto/email-verification.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(registerSchema))
  async register(@Body() dto: RegisterDto): Promise<RegisterResult> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.authService.login(dto.email, dto.password, loginSessionClient(dto));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(refreshTokenSchema))
  async refresh(@Body() dto: RefreshTokenDto): Promise<RefreshResult> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.authService.logout(user.id, user.sessionId);
  }

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserProfile> {
    return this.authService.getProfile(user.id);
  }

  @Public()
  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(requestPasswordResetSchema))
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto): Promise<{ accepted: true }> {
    return this.passwordResetService.requestReset(dto.email);
  }

  @Public()
  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(confirmPasswordResetSchema))
  async confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto): Promise<{ reset: boolean }> {
    return this.passwordResetService.confirmReset(dto.token, dto.password);
  }

  @Public()
  @Post('email-verification/resend')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(resendVerificationSchema))
  async resendVerification(@Body() dto: ResendVerificationDto): Promise<{ accepted: true }> {
    return this.emailVerificationService.resend(dto.email);
  }

  @Public()
  @Post('email-verification/confirm')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(verifyEmailSchema))
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ verified: boolean }> {
    return this.emailVerificationService.verify(dto.token);
  }
}
