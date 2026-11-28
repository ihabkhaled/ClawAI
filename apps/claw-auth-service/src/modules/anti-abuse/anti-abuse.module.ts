import { Module } from '@nestjs/common';

import { RedisModule } from '../../infrastructure/redis/redis.module';
import { AbuseDefenseModule } from '../abuse-defense/abuse-defense.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { CaptchaHttpAdapter } from './adapters/captcha-http.adapter';
import { DnsLookupAdapter } from './adapters/dns-lookup.adapter';
import { AdminLinkedAccountsController } from './controllers/admin-linked-accounts.controller';
import { AdminSignupProtectionController } from './controllers/admin-signup-protection.controller';
import { AntiAbuseCounterRepository } from './repositories/anti-abuse-counter.repository';
import { UserDeviceRepository } from './repositories/user-device.repository';
import { BotCheckService } from './services/bot-check.service';
import { CaptchaVerificationService } from './services/captcha-verification.service';
import { DeviceTrustService } from './services/device-trust.service';
import { EmailDomainPolicyService } from './services/email-domain-policy.service';
import { LinkedAccountsService } from './services/linked-accounts.service';
import { LoginScreeningService } from './services/login-screening.service';
import { MailDomainService } from './services/mail-domain.service';
import { ProofOfWorkService } from './services/proof-of-work.service';
import { RegistrationScreeningService } from './services/registration-screening.service';
import { SecurityEventService } from './services/security-event.service';
import { SecuritySettingsService } from './services/security-settings.service';
import { SignupVelocityService } from './services/signup-velocity.service';

/**
 * Sign-up and sign-in screening (security incident 2026-11-27): bot checks,
 * disposable / undeliverable email domains, sign-up velocity, one free trial per
 * device, and the admin linked-accounts view.
 *
 * The public `/auth/bot-check/*` routes live on AuthModule's controller (they
 * need the auth route rate limiter); this module exports the two screening
 * services AuthService calls and the bot-check service that controller uses.
 */
@Module({
  imports: [SystemSettingsModule, RedisModule, AbuseDefenseModule],
  controllers: [AdminLinkedAccountsController, AdminSignupProtectionController],
  providers: [
    CaptchaHttpAdapter,
    DnsLookupAdapter,
    AntiAbuseCounterRepository,
    UserDeviceRepository,
    SecuritySettingsService,
    ProofOfWorkService,
    CaptchaVerificationService,
    BotCheckService,
    MailDomainService,
    EmailDomainPolicyService,
    SignupVelocityService,
    DeviceTrustService,
    SecurityEventService,
    RegistrationScreeningService,
    LoginScreeningService,
    LinkedAccountsService,
  ],
  exports: [BotCheckService, RegistrationScreeningService, LoginScreeningService],
})
export class AntiAbuseModule {}
