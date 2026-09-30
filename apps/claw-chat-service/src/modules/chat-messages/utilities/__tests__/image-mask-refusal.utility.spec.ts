import { ImageMaskRefusalCode } from '../../../../common/enums';
import { IMAGE_MASK_REFUSAL_TEXT } from '../../constants/image-mask-refusal.constants';
import {
  imageMaskRefusalResponse,
  readImageMaskRefusalCode,
  readMaskFileId,
} from '../image-mask-refusal.utility';

// Pack §81: a drawn mask travels frontend -> chat metadata -> image-service,
// and image-service's two 422 codes come back as a finished, translated notice.
describe('image mask refusal', () => {
  describe('readMaskFileId', () => {
    it('reads the mask id off user-message metadata', () => {
      expect(readMaskFileId({ fileIds: ['a'], maskFileId: 'mask-1' })).toBe('mask-1');
    });

    it.each([null, undefined, 'x', 3, {}, { maskFileId: 5 }, { maskFileId: '' }])(
      'returns undefined for %p',
      (metadata) => {
        expect(readMaskFileId(metadata)).toBeUndefined();
      },
    );
  });

  describe('readImageMaskRefusalCode', () => {
    it.each([ImageMaskRefusalCode.MASK_INVALID, ImageMaskRefusalCode.MASK_NOT_SUPPORTED])(
      'recognises a 422 carrying %s',
      (code) => {
        expect(readImageMaskRefusalCode(422, { code })).toBe(code);
      },
    );

    it('ignores other statuses, other codes and non-objects', () => {
      expect(readImageMaskRefusalCode(400, { code: 'IMAGE_MASK_INVALID' })).toBeUndefined();
      expect(readImageMaskRefusalCode(422, { code: 'IMAGE_EDIT_UNAVAILABLE' })).toBeUndefined();
      expect(readImageMaskRefusalCode(422, null)).toBeUndefined();
      expect(readImageMaskRefusalCode(422, 'IMAGE_MASK_INVALID')).toBeUndefined();
      expect(readImageMaskRefusalCode(422, { code: 7 })).toBeUndefined();
    });
  });

  it('builds a finished reply that names the code and starts no generation', () => {
    const response = imageMaskRefusalResponse(
      ImageMaskRefusalCode.MASK_NOT_SUPPORTED,
      'IMAGE_GEMINI',
      'gemini-2.5-flash-image',
      Date.now(),
      false,
    );
    expect(response.imageMaskRefusal).toEqual({ code: ImageMaskRefusalCode.MASK_NOT_SUPPORTED });
    expect(response.content).toBe(IMAGE_MASK_REFUSAL_TEXT[ImageMaskRefusalCode.MASK_NOT_SUPPORTED]);
    expect(response.imageGenerationId).toBeUndefined();
    expect(response.finishReason).toBe('stop');
  });
});
