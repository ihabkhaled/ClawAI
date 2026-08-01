import { Body, Controller, Get, HttpCode, HttpStatus, Post, UsePipes } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { Public } from '../../../app/decorators/public.decorator';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { LoginDto, loginSchema, loginSessionClient } from '../dto/login.dto';
import { RegisterDto, registerSchema } from '../dto/register.dto';
import { RefreshTokenDto, refreshTokenSchema } from '../dto/refresh-token.dto';
import { AuthenticatedUser } from '../../../common/types';
import { LoginResult, RefreshResult, RegisterResult, UserProfile } from '../types/auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(registerSchema))
  async register(@Body() dto: RegisterDto): Promise<RegisterResult> {
    return this.authService.register(dto.email, dto.password);
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
}
