import { Module } from '@nestjs/common';

import { EmailSignatureController } from './controllers/email-signature.controller';
import { EmailSignatureRepository } from './repositories/email-signature.repository';
import { EmailSignatureService } from './services/email-signature.service';

@Module({
  controllers: [EmailSignatureController],
  providers: [EmailSignatureRepository, EmailSignatureService],
  exports: [EmailSignatureService],
})
export class EmailSignaturesModule {}
