import { describe, expect, it } from 'vitest';

import { ImageMaskRefusalCode } from '@/enums/image-mask-refusal-code.enum';
import { readImageMaskRefusal } from '@/utilities/image-mask-refusal.utility';

describe('readImageMaskRefusal', () => {
  it.each([
    ['IMAGE_MASK_INVALID', ImageMaskRefusalCode.MaskInvalid],
    ['IMAGE_MASK_NOT_SUPPORTED', ImageMaskRefusalCode.MaskNotSupported],
  ])('reads %s from the refusal metadata', (wire, expected) => {
    expect(readImageMaskRefusal({ type: 'image_mask_refusal', maskRefusalCode: wire })).toBe(
      expected,
    );
  });

  it.each([
    [null],
    [{}],
    [{ type: 'image_generation', maskRefusalCode: 'IMAGE_MASK_INVALID' }],
    [{ type: 'image_mask_refusal' }],
    [{ type: 'image_mask_refusal', maskRefusalCode: 'SOMETHING_NEWER' }],
  ])('reads %j as no refusal', (metadata) => {
    expect(readImageMaskRefusal(metadata)).toBeNull();
  });
});
