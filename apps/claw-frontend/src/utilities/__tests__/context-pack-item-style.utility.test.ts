import { describe, expect, it } from 'vitest';

import { ContextPackItemTypeV2 } from '@/enums';
import { en } from '@/lib/i18n/locales/en';
import {
  getContextPackItemTypeIcon,
  getContextPackItemTypeLabelKey,
  getContextPackItemTypeTone,
} from '@/utilities';

/**
 * These three helpers answer for a value that arrives from the API, so an
 * unrecognised one must degrade, never throw.
 *
 * The label lookup used to be a `Record` index keyed by a frontend-only enum
 * the database never had. Every real item missed it, the resulting `undefined`
 * went into `t()`, and `key.split('.')` crashed the whole context pack page. So
 * the case that matters most is the exhaustiveness one: every value the API can
 * send resolves to a key that actually exists in the dictionary.
 */
describe('context pack item style helpers', () => {
  const allTypes = Object.values(ContextPackItemTypeV2);

  it('covers every type the API can send', () => {
    expect(allTypes).toHaveLength(6);
    for (const type of allTypes) {
      expect(getContextPackItemTypeLabelKey(type)).not.toBeNull();
    }
  });

  it('resolves every key to real copy in the dictionary', () => {
    for (const type of allTypes) {
      const key = getContextPackItemTypeLabelKey(type);
      expect(key).not.toBeNull();
      const [namespace, leaf] = String(key).split('.');
      expect(namespace).toBe('context');
      const copy = (en.context as unknown as Record<string, unknown>)[String(leaf)];
      expect(typeof copy).toBe('string');
      expect(copy).not.toBe('');
    }
  });

  it('gives each type its own icon and tone', () => {
    const icons = new Set(allTypes.map((type) => getContextPackItemTypeIcon(type)));
    const tones = new Set(allTypes.map((type) => getContextPackItemTypeTone(type)));
    expect(icons.size).toBe(allTypes.length);
    expect(tones.size).toBe(allTypes.length);
  });

  describe('an unrecognised type', () => {
    // NOTE and FILE_REFERENCE are the deleted V1 values — the exact shape of
    // the crash. They must now resolve to null and be rendered raw.
    it.each(['NOTE', 'FILE_REFERENCE', '', 'SOMETHING_NEW'])('degrades for "%s"', (type) => {
      expect(getContextPackItemTypeLabelKey(type)).toBeNull();
      expect(getContextPackItemTypeIcon(type)).toBeDefined();
      expect(getContextPackItemTypeTone(type)).toBe('bg-muted text-muted-foreground');
    });
  });
});
