import { type Mock, vi } from 'vitest';
import { httpPost } from '@common/utilities';

import { BusinessException } from '../../../../common/errors';
import { editWithOpenAI } from '../openai-image-edit.adapter';

vi.mock('@common/utilities', async () => ({
  ...(await vi.importActual('@common/utilities')),
  httpPost: vi.fn(),
}));

const mockPost = vi.mocked(httpPost) as Mock;

const request = {
  baseUrl: 'https://api.openai.test/v1/',
  apiKey: 'sk-test',
  prompt: 'remove the background',
  model: 'gpt-image-1',
  width: 1024,
  height: 1536,
  quality: 'high',
  imageBase64: Buffer.from('source-bytes').toString('base64'),
  imageMimeType: 'image/jpeg',
};

const formOf = (): FormData => mockPost.mock.calls[0]?.[1] as FormData;

describe('editWithOpenAI (POST /v1/images/edits)', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('sends a multipart edit: image[], prompt, n=1, size, pinned quality, bearer key', async () => {
    mockPost.mockResolvedValue({ created: 1, data: [{ b64_json: 'aW1n' }] });

    const result = await editWithOpenAI(request);

    expect(mockPost.mock.calls[0]?.[0]).toBe('https://api.openai.test/v1/images/edits');
    expect(mockPost.mock.calls[0]?.[2]).toMatchObject({
      headers: { Authorization: 'Bearer sk-test' },
    });
    const form = formOf();
    expect(form.get('model')).toBe('gpt-image-1');
    expect(form.get('prompt')).toBe('remove the background');
    expect(form.get('n')).toBe('1');
    expect(form.get('size')).toBe('1024x1536');
    expect(form.get('quality')).toBe('high');
    const image = form.get('image[]');
    expect(image).toBeInstanceOf(Blob);
    expect((image as Blob).type).toBe('image/jpeg');
    expect(Buffer.from(await (image as Blob).arrayBuffer()).toString()).toBe('source-bytes');
    expect(form.has('mask')).toBe(false);
    expect(result).toMatchObject({ imageBase64: 'aW1n', mimeType: 'image/png' });
  });

  it('forwards a mask as a PNG part', async () => {
    mockPost.mockResolvedValue({ created: 1, data: [{ b64_json: 'aW1n' }] });

    await editWithOpenAI({ ...request, maskBase64: Buffer.from('mask').toString('base64') });

    const mask = formOf().get('mask');
    expect(mask).toBeInstanceOf(Blob);
    expect((mask as Blob).type).toBe('image/png');
  });

  it('classifies a provider refusal and an empty answer', async () => {
    mockPost.mockRejectedValueOnce(Object.assign(new Error('boom'), { response: { status: 401 } }));
    await expect(editWithOpenAI(request)).rejects.toBeInstanceOf(BusinessException);

    mockPost.mockResolvedValueOnce({ created: 1, data: [] });
    await expect(editWithOpenAI(request)).rejects.toMatchObject({
      code: 'IMAGE_NO_IMAGE_RETURNED',
    });
  });
});
