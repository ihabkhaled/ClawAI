import { type BusinessCategory } from '../../../common/enums/business-category.enum';
import { ModelCategory } from '../../../generated/prisma';
import {
  CONFIDENCE_CAPABILITY_BOOST,
  CONFIDENCE_DEFAULT,
  CONFIDENCE_FAMILY_MATCH,
  CONFIDENCE_KEYWORD_BOOST,
  CONFIDENCE_MAX,
} from '../constants/discovery.constants';
import {
  FAMILY_TAXONOMY,
  KEYWORD_TO_BUSINESS,
  KEYWORD_TO_CATEGORY,
} from '../constants/model-family-taxonomy.constants';
import type { ClassifierInput, ClassifierResult } from '../types/discovery.types';
import { extractFamily } from './model-normalizer.utility';

function collectSignalText(input: ClassifierInput): string {
  return [input.name, input.displayName, input.description ?? '', input.capabilities.join(' ')]
    .join(' ')
    .toLowerCase();
}

function findFamilyEntry(name: string): (typeof FAMILY_TAXONOMY)[number] | null {
  const family = extractFamily(name);
  if (family === null) return null;
  return FAMILY_TAXONOMY.find((entry) => entry.family === family) ?? null;
}

function matchKeywordsToCategory(signal: string): ModelCategory | null {
  for (const keyword of Object.keys(KEYWORD_TO_CATEGORY)) {
    if (signal.includes(keyword)) {
      const value = KEYWORD_TO_CATEGORY[keyword];
      if (value !== undefined) {
        return value;
      }
    }
  }
  return null;
}

function collectBusinessFromKeywords(signal: string): BusinessCategory[] {
  const matches: BusinessCategory[] = [];
  for (const keyword of Object.keys(KEYWORD_TO_BUSINESS)) {
    if (signal.includes(keyword)) {
      const value = KEYWORD_TO_BUSINESS[keyword];
      if (value !== undefined) {
        matches.push(value);
      }
    }
  }
  return matches;
}

function dedupeBusinessCategories(values: BusinessCategory[]): BusinessCategory[] {
  return [...new Set(values)];
}

function scoreConfidence(
  hasFamily: boolean,
  keywordMatches: number,
  capabilityMatches: number,
): number {
  let score = CONFIDENCE_DEFAULT;
  if (hasFamily) score += CONFIDENCE_FAMILY_MATCH;
  score += keywordMatches * CONFIDENCE_KEYWORD_BOOST;
  score += capabilityMatches * CONFIDENCE_CAPABILITY_BOOST;
  return Math.min(CONFIDENCE_MAX, score);
}

export function classifyModel(input: ClassifierInput): ClassifierResult {
  const signal = collectSignalText(input);
  const familyEntry = findFamilyEntry(input.name);
  const keywordCategory = matchKeywordsToCategory(signal);
  const keywordBusiness = collectBusinessFromKeywords(signal);

  let category: ModelCategory;
  const businessCategories: BusinessCategory[] = [...keywordBusiness];

  if (keywordCategory !== null && familyEntry === null) {
    category = keywordCategory;
  } else if (familyEntry !== null) {
    category = familyEntry.defaultCategory;
    businessCategories.push(...familyEntry.businessCategories);

    if (keywordCategory !== null && keywordCategory !== familyEntry.defaultCategory) {
      const nameLower = input.name.toLowerCase();
      if (nameLower.includes('coder') || nameLower.includes('code')) {
        category = ModelCategory.CODING;
      } else if (nameLower.includes('marketing') || nameLower.includes('sales')) {
        category = ModelCategory.MARKETING;
      } else if (nameLower.includes('medical') || nameLower.includes('med')) {
        category = ModelCategory.MEDICAL;
      }
    }
  } else {
    category = ModelCategory.GENERAL;
  }

  const confidence = scoreConfidence(
    familyEntry !== null,
    keywordBusiness.length,
    input.capabilities.length,
  );

  return {
    category,
    businessCategories: dedupeBusinessCategories(businessCategories),
    confidence: Math.round(confidence * 100) / 100,
  };
}
