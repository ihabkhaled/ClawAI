import { CapabilityRouterManager } from '../managers/capability-router.manager';
import { ModelCapability } from '../../../common/enums/model-capability.enum';
import { type RoutingContext } from '../types/routing.types';

const healthyContext: RoutingContext = {
  message: '',
  connectorHealth: { OPENAI: true, ANTHROPIC: true, GEMINI: true },
  runtimeHealth: { OLLAMA: true },
};

const noCloudContext: RoutingContext = {
  message: '',
  connectorHealth: { OPENAI: false, ANTHROPIC: false, GEMINI: false },
  runtimeHealth: { OLLAMA: true },
};

describe('CapabilityRouterManager', () => {
  let manager: CapabilityRouterManager;

  beforeEach(() => {
    manager = new CapabilityRouterManager();
  });

  // ─── detectRequiredCapability ─────────────────────────────────────────────
  describe('detectRequiredCapability', () => {
    it('detects AUDIO_INPUT from transcription keywords', () => {
      expect(manager.detectRequiredCapability('transcribe this audio file')).toBe(
        ModelCapability.AUDIO_INPUT,
      );
      expect(manager.detectRequiredCapability('speech to text')).toBe(ModelCapability.AUDIO_INPUT);
      expect(manager.detectRequiredCapability('convert this mp3')).toBe(
        ModelCapability.AUDIO_INPUT,
      );
    });

    it('detects VIDEO_INPUT from video keywords', () => {
      expect(manager.detectRequiredCapability('analyze this video')).toBe(
        ModelCapability.VIDEO_INPUT,
      );
      expect(manager.detectRequiredCapability('describe this video clip')).toBe(
        ModelCapability.VIDEO_INPUT,
      );
    });

    it('detects PDF_INPUT from document keywords', () => {
      expect(manager.detectRequiredCapability('summarize this document')).toBe(
        ModelCapability.PDF_INPUT,
      );
      expect(manager.detectRequiredCapability('extract from pdf')).toBe(ModelCapability.PDF_INPUT);
      expect(manager.detectRequiredCapability('read the attached document')).toBe(
        ModelCapability.PDF_INPUT,
      );
    });

    it('detects OCR from text-extraction keywords', () => {
      expect(manager.detectRequiredCapability('extract text from this image')).toBe(
        ModelCapability.OCR,
      );
      expect(manager.detectRequiredCapability('what is written on this sign')).toBe(
        ModelCapability.OCR,
      );
      expect(manager.detectRequiredCapability('ocr this screenshot')).toBe(ModelCapability.OCR);
    });

    it('detects WEB_SEARCH from search keywords', () => {
      expect(manager.detectRequiredCapability('search the web for this')).toBe(
        ModelCapability.WEB_SEARCH,
      );
      expect(manager.detectRequiredCapability('latest news on this topic')).toBe(
        ModelCapability.WEB_SEARCH,
      );
      expect(manager.detectRequiredCapability('what happened today in tech')).toBe(
        ModelCapability.WEB_SEARCH,
      );
    });

    it('detects IMAGE_INPUT from vision keywords', () => {
      expect(manager.detectRequiredCapability('what is in this image?')).toBe(
        ModelCapability.IMAGE_INPUT,
      );
      expect(manager.detectRequiredCapability('describe this photo')).toBe(
        ModelCapability.IMAGE_INPUT,
      );
      expect(manager.detectRequiredCapability('analyze this chart')).toBe(
        ModelCapability.IMAGE_INPUT,
      );
    });

    it('returns null for plain text messages', () => {
      expect(manager.detectRequiredCapability('hello how are you')).toBeNull();
      expect(manager.detectRequiredCapability('write a python function')).toBeNull();
      expect(manager.detectRequiredCapability('explain jwt authentication')).toBeNull();
    });

    it('audio detection takes priority over document detection', () => {
      // "transcribe" is an audio pattern, even if message also mentions document
      expect(manager.detectRequiredCapability('transcribe this document audio')).toBe(
        ModelCapability.AUDIO_INPUT,
      );
    });

    it('video detection takes priority over vision detection', () => {
      expect(manager.detectRequiredCapability('analyze this video clip image')).toBe(
        ModelCapability.VIDEO_INPUT,
      );
    });
  });

  // ─── route ────────────────────────────────────────────────────────────────
  describe('route', () => {
    it('routes audio to GEMINI when healthy', () => {
      const context: RoutingContext = {
        ...healthyContext,
        message: 'transcribe this audio file',
      };
      const result = manager.route(context);
      expect(result).not.toBeNull();
      expect(result?.provider).toBe('GEMINI');
      expect(result?.capability).toBe(ModelCapability.AUDIO_INPUT);
      expect(result?.reason).toBe('capability_audio_input');
    });

    it('routes video to GEMINI when healthy', () => {
      const context: RoutingContext = {
        ...healthyContext,
        message: 'analyze this video clip',
      };
      const result = manager.route(context);
      expect(result?.provider).toBe('GEMINI');
      expect(result?.capability).toBe(ModelCapability.VIDEO_INPUT);
    });

    it('routes PDF analysis to GEMINI when healthy', () => {
      const context: RoutingContext = {
        ...healthyContext,
        message: 'summarize this document',
      };
      const result = manager.route(context);
      expect(result?.provider).toBe('GEMINI');
      expect(result?.capability).toBe(ModelCapability.PDF_INPUT);
    });

    it('routes OCR to GEMINI when healthy', () => {
      const context: RoutingContext = {
        ...healthyContext,
        message: 'extract text from this image',
      };
      const result = manager.route(context);
      expect(result?.provider).toBe('GEMINI');
      expect(result?.capability).toBe(ModelCapability.OCR);
    });

    it('routes web search to GEMINI when healthy', () => {
      const context: RoutingContext = {
        ...healthyContext,
        message: 'search the web for latest AI news',
      };
      const result = manager.route(context);
      expect(result?.provider).toBe('GEMINI');
      expect(result?.capability).toBe(ModelCapability.WEB_SEARCH);
    });

    it('routes vision to GEMINI when healthy', () => {
      const context: RoutingContext = {
        ...healthyContext,
        message: 'what is in this image?',
      };
      const result = manager.route(context);
      expect(result?.provider).toBe('GEMINI');
      expect(result?.capability).toBe(ModelCapability.IMAGE_INPUT);
    });

    it('falls back to OPENAI when GEMINI unavailable for audio', () => {
      const context: RoutingContext = {
        ...healthyContext,
        message: 'transcribe this audio file',
        connectorHealth: { GEMINI: false, OPENAI: true, ANTHROPIC: true },
      };
      const result = manager.route(context);
      expect(result?.provider).toBe('OPENAI');
    });

    it('falls back to ANTHROPIC when GEMINI and OPENAI unavailable for PDF', () => {
      const context: RoutingContext = {
        ...healthyContext,
        message: 'extract from pdf',
        connectorHealth: { GEMINI: false, OPENAI: false, ANTHROPIC: true },
      };
      const result = manager.route(context);
      expect(result?.provider).toBe('ANTHROPIC');
    });

    it('returns null when no capable provider is available', () => {
      const context: RoutingContext = {
        ...noCloudContext,
        message: 'analyze this video clip',
      };
      // VIDEO_INPUT only available on GEMINI; GEMINI is unhealthy
      const result = manager.route(context);
      expect(result).toBeNull();
    });

    it('returns null for plain text messages', () => {
      const context: RoutingContext = {
        ...healthyContext,
        message: 'hello, how are you?',
      };
      expect(manager.route(context)).toBeNull();
    });

    it('uses default health (true) when connector health map is empty', () => {
      const context: RoutingContext = {
        message: 'transcribe this audio file',
        connectorHealth: {},
        runtimeHealth: {},
      };
      const result = manager.route(context);
      expect(result?.provider).toBe('GEMINI');
    });

    // ─── Phase 3: reason string format ───────────────────────────────────────
    it('reason string is lowercase underscore format — capability_audio_input', () => {
      const result = manager.route({ ...healthyContext, message: 'transcribe this audio file' });
      expect(result?.reason).toBe('capability_audio_input');
    });

    it('reason string is lowercase underscore format — capability_image_input', () => {
      const result = manager.route({ ...healthyContext, message: 'what is in this image?' });
      expect(result?.reason).toBe('capability_image_input');
    });

    it('reason string is lowercase underscore format — capability_web_search', () => {
      const result = manager.route({ ...healthyContext, message: 'search the web for news' });
      expect(result?.reason).toBe('capability_web_search');
    });

    // ─── Phase 3: fallback chains ─────────────────────────────────────────────
    it('OCR: falls back to ANTHROPIC when GEMINI unavailable', () => {
      const result = manager.route({
        ...healthyContext,
        message: 'extract text from this image',
        connectorHealth: { GEMINI: false, OPENAI: true, ANTHROPIC: true },
      });
      // OCR priority: GEMINI → ANTHROPIC → OPENAI
      expect(result?.provider).toBe('ANTHROPIC');
      expect(result?.capability).toBe(ModelCapability.OCR);
    });

    it('OCR: falls back to OPENAI when GEMINI+ANTHROPIC unavailable', () => {
      const result = manager.route({
        ...healthyContext,
        message: 'ocr this document',
        connectorHealth: { GEMINI: false, OPENAI: true, ANTHROPIC: false },
      });
      expect(result?.provider).toBe('OPENAI');
    });

    it('WEB_SEARCH: falls back to OPENAI when GEMINI unavailable', () => {
      const result = manager.route({
        ...healthyContext,
        message: 'search the web for latest AI news',
        connectorHealth: { GEMINI: false, OPENAI: true, ANTHROPIC: true },
      });
      expect(result?.provider).toBe('OPENAI');
    });

    it('WEB_SEARCH: returns null when GEMINI+OPENAI both unavailable', () => {
      const result = manager.route({
        ...healthyContext,
        message: 'search the web for news',
        connectorHealth: { GEMINI: false, OPENAI: false, ANTHROPIC: true },
      });
      // WEB_SEARCH priority: GEMINI → OPENAI only (ANTHROPIC not supported)
      expect(result).toBeNull();
    });

    it('IMAGE_INPUT: routes to local-ollama when all cloud unavailable', () => {
      const result = manager.route({
        message: 'what is in this image?',
        connectorHealth: { GEMINI: false, OPENAI: false, ANTHROPIC: false },
        runtimeHealth: { OLLAMA: true },
      });
      // IMAGE_INPUT priority: GEMINI → ANTHROPIC → OPENAI → local-ollama
      expect(result?.provider).toBe('local-ollama');
    });

    it('PDF: returns null when all cloud unavailable (local-ollama has no PDF_INPUT)', () => {
      const result = manager.route({
        message: 'summarize this document',
        connectorHealth: { GEMINI: false, OPENAI: false, ANTHROPIC: false },
        runtimeHealth: { OLLAMA: true },
      });
      expect(result).toBeNull();
    });

    // ─── Phase 3: connector health undefined/null ─────────────────────────────
    it('treats undefined connectorHealth as fully healthy', () => {
      const result = manager.route({
        message: 'transcribe this audio file',
        connectorHealth: undefined,
        runtimeHealth: { OLLAMA: true },
      });
      expect(result?.provider).toBe('GEMINI');
    });

    // ─── Phase 3: case sensitivity (via route() which normalizes to lowercase) ─
    it('route() is case-insensitive — UPPERCASE audio message routes correctly', () => {
      const result = manager.route({ ...healthyContext, message: 'TRANSCRIBE THIS AUDIO FILE' });
      expect(result?.capability).toBe(ModelCapability.AUDIO_INPUT);
      expect(result?.provider).toBe('GEMINI');
    });

    it('route() is case-insensitive — mixed-case vision message routes correctly', () => {
      const result = manager.route({ ...healthyContext, message: 'What Is In This Image?' });
      expect(result?.capability).toBe(ModelCapability.IMAGE_INPUT);
      expect(result?.provider).toBe('GEMINI');
    });

    // ─── Phase 3: local-ollama health check ───────────────────────────────────
    it('local-ollama unavailable does not affect cloud provider selection', () => {
      const result = manager.route({
        message: 'transcribe this audio file',
        connectorHealth: { GEMINI: true, OPENAI: true },
        runtimeHealth: { OLLAMA: false },
      });
      // OLLAMA health doesn't affect GEMINI for audio
      expect(result?.provider).toBe('GEMINI');
    });

    it('IMAGE_INPUT skips local-ollama when OLLAMA runtime is unhealthy', () => {
      const result = manager.route({
        message: 'what is in this image?',
        connectorHealth: { GEMINI: false, OPENAI: false, ANTHROPIC: false },
        runtimeHealth: { OLLAMA: false },
      });
      // All cloud down + OLLAMA down → null
      expect(result).toBeNull();
    });
  });
});
