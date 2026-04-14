import { ModelCapability } from '../../../common/enums/model-capability.enum';
import type { ProviderCapabilityEntry } from '../types/capability.types';

// ─── Provider capability matrix ───────────────────────────────────────────────
// Each entry represents the best model for multimodal routing at that provider.
// Providers without a capability will not be selected for that modality.
export const PROVIDER_CAPABILITY_MATRIX: ProviderCapabilityEntry[] = [
  {
    provider: 'ANTHROPIC',
    model: 'claude-sonnet-4',
    capabilities: [
      ModelCapability.TEXT,
      ModelCapability.CODE,
      ModelCapability.IMAGE_INPUT,
      ModelCapability.PDF_INPUT,
      ModelCapability.TOOL_CALLING,
      ModelCapability.STRUCTURED_OUTPUT,
      ModelCapability.REASONING,
      ModelCapability.OCR,
    ],
  },
  {
    provider: 'OPENAI',
    model: 'gpt-4o',
    capabilities: [
      ModelCapability.TEXT,
      ModelCapability.CODE,
      ModelCapability.IMAGE_INPUT,
      ModelCapability.IMAGE_OUTPUT,
      ModelCapability.AUDIO_INPUT,
      ModelCapability.PDF_INPUT,
      ModelCapability.WEB_SEARCH,
      ModelCapability.TOOL_CALLING,
      ModelCapability.STRUCTURED_OUTPUT,
      ModelCapability.OCR,
    ],
  },
  {
    provider: 'GEMINI',
    model: 'gemini-2.5-flash',
    capabilities: [
      ModelCapability.TEXT,
      ModelCapability.CODE,
      ModelCapability.IMAGE_INPUT,
      ModelCapability.VIDEO_INPUT,
      ModelCapability.AUDIO_INPUT,
      ModelCapability.PDF_INPUT,
      ModelCapability.WEB_SEARCH,
      ModelCapability.TOOL_CALLING,
      ModelCapability.STRUCTURED_OUTPUT,
      ModelCapability.OCR,
    ],
  },
  {
    provider: 'DEEPSEEK',
    model: 'deepseek-r1',
    capabilities: [ModelCapability.TEXT, ModelCapability.CODE, ModelCapability.REASONING],
  },
  {
    provider: 'local-ollama',
    model: 'gemma3:4b',
    capabilities: [ModelCapability.TEXT, ModelCapability.CODE, ModelCapability.IMAGE_INPUT],
  },
];

// ─── Modality detection keyword patterns ──────────────────────────────────────
// These are checked AFTER image/file generation detection to avoid double-routing.

export const AUDIO_MODALITY_PATTERNS: string[] = [
  'transcribe',
  'transcription',
  'speech to text',
  'audio file',
  'mp3',
  'wav file',
  'voice recording',
  'podcast',
  'dictation',
  'listen to',
  'what is being said',
  'audio transcript',
  'convert speech',
  'recognize speech',
  'voice memo',
];

export const VIDEO_MODALITY_PATTERNS: string[] = [
  'analyze this video',
  'describe this video',
  'what happens in this video',
  'video content',
  'mp4',
  'avi file',
  'watch this',
  'video clip',
  'footage',
  'screen recording',
  'video transcript',
  'frames from',
];

export const PDF_MODALITY_PATTERNS: string[] = [
  'this pdf',
  'the pdf',
  'from the pdf',
  'this document',
  'the document',
  'this report',
  'read this document',
  'summarize this document',
  'extract from pdf',
  'parse this pdf',
  'document attached',
  'attached document',
  'read the attached',
  'analyze this file',
  'this spreadsheet',
  'this presentation',
  'this slide',
];

export const OCR_MODALITY_PATTERNS: string[] = [
  'extract text from',
  'read text in',
  'ocr',
  'text in this image',
  'words in this image',
  'text from screenshot',
  'what does it say',
  'read this sign',
  'handwritten text',
  'written on',
  'text on',
  'what is written',
];

export const WEB_SEARCH_MODALITY_PATTERNS: string[] = [
  'search the web',
  'look it up',
  'find online',
  'browse the internet',
  'latest news',
  'current information',
  'real-time data',
  'up to date',
  'recent events',
  'what happened today',
  'today news',
  'live data',
  'web search',
  'google this',
  'search for',
  'find me the latest',
  'current price',
  'current stock',
  'trending',
];

export const VISION_MODALITY_PATTERNS: string[] = [
  'in this image',
  'in the image',
  'this picture',
  'this photo',
  'this screenshot',
  'attached image',
  'the attached',
  'look at this',
  'what do you see',
  'describe this image',
  'analyze this image',
  'what is in this',
  'identify this',
  'read this image',
  'image shows',
  'photo shows',
  'diagram shows',
  'chart shows',
  'this chart',
  'this diagram',
  'this graph',
  'this figure',
];

// ─── Capability routing priority ─────────────────────────────────────────────
// When multiple providers support a capability, order determines preference.
// First entry wins if healthy.
export const CAPABILITY_PROVIDER_PRIORITY: Record<string, string[]> = {
  [ModelCapability.AUDIO_INPUT]: ['GEMINI', 'OPENAI'],
  [ModelCapability.VIDEO_INPUT]: ['GEMINI'],
  [ModelCapability.PDF_INPUT]: ['GEMINI', 'ANTHROPIC', 'OPENAI'],
  [ModelCapability.OCR]: ['GEMINI', 'ANTHROPIC', 'OPENAI'],
  [ModelCapability.WEB_SEARCH]: ['GEMINI', 'OPENAI'],
  [ModelCapability.IMAGE_INPUT]: ['GEMINI', 'ANTHROPIC', 'OPENAI', 'local-ollama'],
  [ModelCapability.TOOL_CALLING]: ['ANTHROPIC', 'OPENAI', 'GEMINI'],
  [ModelCapability.REASONING]: ['ANTHROPIC', 'DEEPSEEK'],
  [ModelCapability.STRUCTURED_OUTPUT]: ['OPENAI', 'ANTHROPIC', 'GEMINI'],
};
