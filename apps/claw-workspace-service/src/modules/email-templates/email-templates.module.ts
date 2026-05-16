import { Module } from '@nestjs/common';

import { EmailTemplateController } from './controllers/email-template.controller';
import { EmailTemplateRepository } from './repositories/email-template.repository';
import { EmailTemplateService } from './services/email-template.service';

@Module({
  controllers: [EmailTemplateController],
  providers: [EmailTemplateRepository, EmailTemplateService],
  exports: [EmailTemplateService],
})
export class EmailTemplatesModule {}
