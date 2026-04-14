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
  });
});
