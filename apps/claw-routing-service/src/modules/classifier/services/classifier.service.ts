import { Injectable } from '@nestjs/common';
import { ClassifierManager } from '../managers/classifier.manager';
import { type ClassificationResult, type ClassifyInput } from '../types/classification.types';

@Injectable()
export class ClassifierService {
  constructor(private readonly manager: ClassifierManager) {}

  classify(input: ClassifyInput): ClassificationResult {
    return this.manager.classify(input);
  }
}
