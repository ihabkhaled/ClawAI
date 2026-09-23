import { type Mock, vi } from 'vitest';
import { httpPost } from '@common/utilities';

import { generateWithOpenAI } from '../openai-image.adapter';

vi.mock('@common/utilities', async () => ({
  ...(await vi.importActual('@common/utilities')),
  httpPost: vi.fn(),
}));

const mockPost = httpPost as unknown as Mock;

function bodyOf(): Record<string, unknown> {
  return mockPost.mock.calls[0]?.[1] as Record<string, unknown>;
}

describe('generateWithOpenAI', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('never sends response_format', async () => {
    // OpenAI removed the parameter and now rejects the whole request with
    // "Unknown parameter: 'response_format'". Sending it made every OpenAI
    // image generation fail with a bare 400.
    mockPost.mockResolvedValue({ data: [{ url: 'https://example.test/a.png' }] });

    await generateWithOpenAI('https://api.openai.test/v1', 'key', 'a cat', 'dall-e-3', 1024, 1024);

    expect(bodyOf()).not.toHaveProperty('response_format');
    expect(bodyOf()).toMatchObject({ model: 'dall-e-3', prompt: 'a cat', size: '1024x1024', n: 1 });
  });

  it('sends style only to dall-e-3', async () => {
    // The other image models reject it exactly as they rejected response_format.
    mockPost.mockResolvedValue({ data: [{ url: 'https://example.test/a.png' }] });
    await generateWithOpenAI('https://x/v1', 'k', 'p', 'dall-e-3', 1024, 1024, undefined, 'vivid');
    expect(bodyOf()).toHaveProperty('style', 'vivid');

    mockPost.mockReset();
    mockPost.mockResolvedValue({ data: [{ b64_json: 'AAA' }] });
    await generateWithOpenAI(
      'https://x/v1',
      'k',
      'p',
      'gpt-image-1',
      1024,
      1024,
      undefined,
      'vivid',
    );
    expect(bodyOf()).not.toHaveProperty('style');
  });

  it('accepts a base64-only response', async () => {
    // gpt-image-1 never returns a URL. Reading `url` alone treated a perfectly
    // good image as an empty response.
    mockPost.mockResolvedValue({ data: [{ b64_json: 'BASE64DATA' }] });

    const result = await generateWithOpenAI('https://x/v1', 'k', 'p', 'gpt-image-1', 1024, 1024);

    expect(result.imageBase64).toBe('BASE64DATA');
    expect(result.mimeType).toBe('image/png');
  });

  it('still accepts a URL response', async () => {
    mockPost.mockResolvedValue({
      data: [{ url: 'https://example.test/a.png', revised_prompt: 'a tidy cat' }],
    });

    const result = await generateWithOpenAI('https://x/v1', 'k', 'p', 'dall-e-3', 1024, 1024);

    expect(result.imageUrl).toBe('https://example.test/a.png');
    expect(result.revisedPrompt).toBe('a tidy cat');
  });

  it('reports the provider message instead of a bare status code', async () => {
    // "status code 400" leaves an operator with no way to tell an unsupported
    // size from an unverified organisation, on a call that costs money to
    // retry blindly.
    mockPost.mockRejectedValue({
      response: { data: { error: { message: "The model 'dall-e-3' does not exist." } } },
    });

    await expect(
      generateWithOpenAI('https://x/v1', 'k', 'p', 'dall-e-3', 1024, 1024),
    ).rejects.toThrow("The model 'dall-e-3' does not exist.");
  });

  it('falls back to the transport error when there is no provider body', async () => {
    mockPost.mockRejectedValue(new Error('socket hang up'));

    await expect(
      generateWithOpenAI('https://x/v1', 'k', 'p', 'dall-e-3', 1024, 1024),
    ).rejects.toThrow('socket hang up');
  });

  it('refuses a response carrying neither a URL nor base64', async () => {
    mockPost.mockResolvedValue({ data: [{}] });

    await expect(
      generateWithOpenAI('https://x/v1', 'k', 'p', 'gpt-image-1', 1024, 1024),
    ).rejects.toThrow('no image payload');
  });
});
