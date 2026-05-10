import { Module } from '@nestjs/common';
import { ClassifierController } from './controllers/classifier.controller';
import { ClassifierService } from './services/classifier.service';
import { ClassifierManager } from './managers/classifier.manager';

@Module({
  controllers: [ClassifierController],
  providers: [ClassifierService, ClassifierManager],
  exports: [ClassifierService, ClassifierManager],
})
export class ClassifierModule {}
