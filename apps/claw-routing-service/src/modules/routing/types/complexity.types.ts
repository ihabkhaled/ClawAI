import type { ComplexityClass } from '../../../common/enums/complexity-class.enum';

export type ComplexityClassification = {
  class: ComplexityClass;
  score: number;
  wordCount: number;
  factors: string[];
};
