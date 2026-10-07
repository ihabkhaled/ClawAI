import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { TOURS_CONTENT_BY_LOCALE } from '@/constants/tours-content.constants';
import { TOUR_DEFINITIONS } from '@/constants/tours.constants';
import { Locale } from '@/enums/locale.enum';

const SRC = join(__dirname, '..', '..');

function componentFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === '__tests__' || name === 'node_modules') {
      return [];
    }
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      return componentFiles(full);
    }
    return name.endsWith('.tsx') ? [full] : [];
  });
}

function placeholders(text: string): string[] {
  return (text.match(/\{\w+\}/gu) ?? []).sort();
}

describe('tour content', () => {
  it('covers all 13 locales', () => {
    expect(Object.keys(TOURS_CONTENT_BY_LOCALE)).toHaveLength(13);
  });

  it.each(Object.values(Locale))('%s has every tour and step, with text', (locale) => {
    const dictionary = TOURS_CONTENT_BY_LOCALE[locale];
    for (const value of Object.values(dictionary.ui)) {
      expect(value.trim().length).toBeGreaterThan(0);
    }
    for (const tour of TOUR_DEFINITIONS) {
      const content = dictionary.tours[tour.id];
      expect(content.title.trim().length).toBeGreaterThan(0);
      expect(content.description.trim().length).toBeGreaterThan(0);
      for (const step of tour.steps) {
        const text = content.steps[step.id];
        expect(text?.title.trim().length).toBeGreaterThan(0);
        expect(text?.body.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps the step-counter placeholders identical across locales', () => {
    const english = placeholders(TOURS_CONTENT_BY_LOCALE[Locale.EN].ui.stepOf);
    for (const locale of Object.values(Locale)) {
      expect(placeholders(TOURS_CONTENT_BY_LOCALE[locale].ui.stepOf)).toEqual(english);
    }
  });
});

describe('tour definitions', () => {
  it('have unique ids and at least one step', () => {
    const ids = TOUR_DEFINITIONS.map((tour) => tour.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const tour of TOUR_DEFINITIONS) {
      expect(tour.steps.length).toBeGreaterThan(0);
    }
  });

  it('point only at data-tour targets that exist in a component', () => {
    const source = componentFiles(SRC)
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    for (const tour of TOUR_DEFINITIONS) {
      for (const step of tour.steps) {
        if (step.target !== null) {
          expect(source).toContain(`data-tour="${step.target}"`);
        }
      }
    }
  });
});
