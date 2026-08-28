import { isGenerationProvider } from '../generation-provider.utility';

describe('isGenerationProvider', () => {
  // Picking any image model in the composer returned "The selected model is not
  // available", because the exposure gate asked the deployment registry about a
  // capability that can never have a row in it.
  it.each(['IMAGE_OPENAI', 'IMAGE_GEMINI', 'IMAGE_LOCAL', 'IMAGE_LOCAL_COMFYUI'])(
    'treats %s as a generation capability, not a deployment',
    (provider) => {
      expect(isGenerationProvider(provider)).toBe(true);
    },
  );

  it('treats file generation the same way', () => {
    expect(isGenerationProvider('FILE_GENERATION')).toBe(true);
  });

  it.each(['OPENAI', 'GEMINI', 'ANTHROPIC', 'OLLAMA', 'local-ollama', 'LLAMACPP'])(
    'leaves the real chat provider %s subject to the exposure gate',
    (provider) => {
      // These DO have deployment rows, and an administrator unexposing one must
      // still block it — that gate is the reason this check exists.
      expect(isGenerationProvider(provider)).toBe(false);
    },
  );
});
