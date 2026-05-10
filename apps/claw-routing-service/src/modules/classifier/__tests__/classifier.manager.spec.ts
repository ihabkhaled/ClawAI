import { Test, type TestingModule } from '@nestjs/testing';
import { DomainTag, PrivacyClass } from '../../../generated/prisma';
import { ClassifierManager } from '../managers/classifier.manager';

describe('ClassifierManager', () => {
  let manager: ClassifierManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClassifierManager],
    }).compile();
    manager = module.get<ClassifierManager>(ClassifierManager);
  });

  describe('domain detection', () => {
    it.each([
      [
        'Help me debug this Python KeyError when iterating a dict during deletion.',
        DomainTag.CODING,
      ],
      [
        'What are the contraindications for prescribing warfarin alongside fluconazole?',
        DomainTag.MEDICAL,
      ],
      ['Draft a cease-and-desist letter for a trademark infringement.', DomainTag.LEGAL],
      [
        'Calculate the WACC for a company with 60% debt @ 5%, 40% equity @ 12%, 25% tax.',
        DomainTag.FINANCE,
      ],
      [
        'Write 5 LinkedIn ad headlines for a B2B HR-tech startup targeting CHROs.',
        DomainTag.MARKETING,
      ],
      [
        'Why does my 2018 Honda Civic make a clicking noise when I turn left?',
        DomainTag.AUTOMOTIVE,
      ],
      [
        'Explain how CRISPR-Cas9 differs from CRISPR-Cas12a in editing precision.',
        DomainTag.BIOLOGY,
      ],
      [
        'Design a 12-week syllabus for an introductory data structures course.',
        DomainTag.EDUCATION,
      ],
      [
        'Write a 500-word horror short story set in a desert at midnight.',
        DomainTag.CREATIVE_WRITING,
      ],
      ['Summarize the latest 2025 papers on synthetic biology platforms.', DomainTag.RESEARCH],
    ])('classifies "%s..." into domain=%s', (prompt, expectedDomain) => {
      const result = manager.classify({ messageContent: prompt });
      expect(result.domain).toBe(expectedDomain);
    });

    it('returns GENERAL with low confidence for emoji-only', () => {
      const result = manager.classify({ messageContent: '🍕🚀😎❤️🌈' });
      expect(result.domain).toBe(DomainTag.GENERAL);
      expect(result.confidence).toBeLessThan(0.6);
      expect(result.reasonTags).toContain('low_confidence');
    });

    it('returns GENERAL with low confidence for short generic', () => {
      const result = manager.classify({ messageContent: 'what is 2+2' });
      expect(result.confidence).toBeLessThan(0.7);
    });
  });

  describe('privacy class derivation', () => {
    it('medical prompt → LOCAL_PREFERRED', () => {
      const result = manager.classify({
        messageContent: 'Patient with sepsis showing rising lactate; differential diagnosis?',
      });
      expect(result.privacyClass).toBe(PrivacyClass.LOCAL_PREFERRED);
    });

    it('legal prompt → LOCAL_PREFERRED', () => {
      const result = manager.classify({
        messageContent: 'Review this contract clause for arbitration enforceability.',
      });
      expect(result.privacyClass).toBe(PrivacyClass.LOCAL_PREFERRED);
    });

    it('explicit [private] marker → LOCAL_ONLY', () => {
      const result = manager.classify({
        messageContent: '[private] Help me draft a marketing campaign for my new product.',
      });
      expect(result.privacyClass).toBe(PrivacyClass.LOCAL_ONLY);
      expect(result.reasonTags).toContain('explicit_private_marker');
    });

    it('coding prompt → CLOUD_PERMITTED', () => {
      const result = manager.classify({
        messageContent: 'Help me debug this typescript function with a null pointer exception.',
      });
      expect(result.privacyClass).toBe(PrivacyClass.CLOUD_PERMITTED);
    });
  });

  describe('risk escalation', () => {
    it('mental-health critical signal → CRITICAL', () => {
      const result = manager.classify({
        messageContent: 'I have been feeling suicidal lately and I do not know what to do.',
      });
      expect(result.riskLevel).toBe('CRITICAL' as never);
      expect(result.reasonTags).toContain('critical_signal');
    });

    it('medical baseline → HIGH', () => {
      const result = manager.classify({
        messageContent:
          'What are the contraindications for prescribing warfarin alongside fluconazole?',
      });
      expect(result.riskLevel).toBe('HIGH');
    });

    it('coding baseline → LOW', () => {
      const result = manager.classify({
        messageContent: 'Help me refactor this function to use generics.',
      });
      expect(result.riskLevel).toBe('LOW');
    });
  });

  describe('modality detection', () => {
    it('YouTube URL → YOUTUBE_INPUT', () => {
      const result = manager.classify({
        messageContent: 'Summarize this video https://youtube.com/watch?v=xyz',
      });
      expect(result.modalityIn).toContain('YOUTUBE_INPUT');
    });

    it('"generate an image of" → IMAGE_OUTPUT', () => {
      const result = manager.classify({
        messageContent: 'Generate an image of a friendly robot.',
      });
      expect(result.modalityOut).toContain('IMAGE_OUTPUT');
    });

    it('PDF attached → PDF_INPUT', () => {
      const result = manager.classify({
        messageContent: 'Summarize this PDF',
        attachedFileMimeTypes: ['application/pdf'],
      });
      expect(result.modalityIn).toContain('PDF_INPUT');
    });

    it('image attached → IMAGE_INPUT', () => {
      const result = manager.classify({
        messageContent: "What's in this image?",
        attachedFileMimeTypes: ['image/png'],
      });
      expect(result.modalityIn).toContain('IMAGE_INPUT');
    });

    it('CSV mention → STRUCTURED_OUTPUT', () => {
      const result = manager.classify({
        messageContent: 'Generate a CSV of 50 sample employee records.',
      });
      expect(result.modalityOut).toContain('STRUCTURED_OUTPUT');
    });
  });

  describe('confidence', () => {
    it('returns confidence in [0, 0.98]', () => {
      const result = manager.classify({
        messageContent: 'Debug this typescript function with a null pointer issue.',
      });
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(0.98);
    });

    it('high-hit-count prompt has higher confidence than low-hit', () => {
      const high = manager.classify({
        messageContent:
          'Debug this typescript function with a stack trace, null pointer, exception, and refactor unit test.',
      });
      const low = manager.classify({ messageContent: 'help me with this code' });
      expect(high.confidence).toBeGreaterThan(low.confidence);
    });
  });

  describe('determinism', () => {
    it('same input twice → same output', () => {
      const a = manager.classify({ messageContent: 'Debug this Python KeyError.' });
      const b = manager.classify({ messageContent: 'Debug this Python KeyError.' });
      expect(a).toEqual(b);
    });
  });

  describe('task family', () => {
    it('PDF input → pdf-summary', () => {
      const result = manager.classify({
        messageContent: 'Summarize this',
        attachedFileMimeTypes: ['application/pdf'],
      });
      expect(result.taskFamily).toBe('pdf-summary');
    });

    it('YouTube → youtube-summary', () => {
      const result = manager.classify({
        messageContent: 'Summarize https://youtube.com/watch?v=abc',
      });
      expect(result.taskFamily).toBe('youtube-summary');
    });

    it('image generation → image-generation', () => {
      const result = manager.classify({
        messageContent: 'Generate an image of a sunset over mountains.',
      });
      expect(result.taskFamily).toBe('image-generation');
    });

    it('plain coding → coding-direct', () => {
      const result = manager.classify({
        messageContent: 'Refactor this function to use async await.',
      });
      expect(result.taskFamily).toBe('coding-direct');
    });
  });
});
