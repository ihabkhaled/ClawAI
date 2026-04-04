import { describe, expect, it } from 'vitest';

import { cn } from '@/utilities/cn.utility';

describe('cn utility', () => {
  it('merges multiple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe(
      'base active',
    );
  });

  it('handles undefined and null values', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });

  it('merges Tailwind conflicts by keeping the last value', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('merges conflicting Tailwind color classes', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('returns empty string when called with no arguments', () => {
    expect(cn()).toBe('');
  });

  it('handles array inputs', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('handles object inputs for conditional classes', () => {
    expect(cn({ active: true, disabled: false, visible: true })).toBe(
      'active visible',
    );
  });
});
