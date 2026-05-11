import { Test, type TestingModule } from '@nestjs/testing';
import { RiskLevel } from '../../../common/enums';
import { DomainTag, ModalityKind, WorkflowKind } from '../../../generated/prisma';
import { WorkflowSelectorManager } from '../managers/workflow-selector.manager';

describe('WorkflowSelectorManager', () => {
  let manager: WorkflowSelectorManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkflowSelectorManager],
    }).compile();
    manager = module.get<WorkflowSelectorManager>(WorkflowSelectorManager);
  });

  const base = {
    domain: DomainTag.GENERAL,
    modalityIn: [ModalityKind.TEXT] as ModalityKind[],
    modalityOut: [ModalityKind.TEXT] as ModalityKind[],
    riskLevel: RiskLevel.LOW,
    messageContent: 'hello',
  };

  describe('modality routing', () => {
    it('PDF input → PDF_EXTRACTION', () => {
      const decision = manager.select({
        ...base,
        modalityIn: [ModalityKind.TEXT, ModalityKind.PDF_INPUT],
      });
      expect(decision.workflowKind).toBe(WorkflowKind.PDF_EXTRACTION);
    });

    it('YouTube input → YOUTUBE_TRANSCRIPT', () => {
      const decision = manager.select({
        ...base,
        modalityIn: [ModalityKind.YOUTUBE_INPUT],
      });
      expect(decision.workflowKind).toBe(WorkflowKind.YOUTUBE_TRANSCRIPT);
    });

    it('image input → IMAGE_ANALYSIS', () => {
      const decision = manager.select({
        ...base,
        modalityIn: [ModalityKind.IMAGE_INPUT],
      });
      expect(decision.workflowKind).toBe(WorkflowKind.IMAGE_ANALYSIS);
    });

    it('audio input → AUDIO_TRANSCRIBE', () => {
      const decision = manager.select({
        ...base,
        modalityIn: [ModalityKind.AUDIO_INPUT],
      });
      expect(decision.workflowKind).toBe(WorkflowKind.AUDIO_TRANSCRIBE);
    });

    it('image output → IMAGE_GENERATION', () => {
      const decision = manager.select({
        ...base,
        modalityOut: [ModalityKind.IMAGE_OUTPUT],
      });
      expect(decision.workflowKind).toBe(WorkflowKind.IMAGE_GENERATION);
    });

    it('structured output → FILE_GENERATION', () => {
      const decision = manager.select({
        ...base,
        modalityOut: [ModalityKind.STRUCTURED_OUTPUT],
      });
      expect(decision.workflowKind).toBe(WorkflowKind.FILE_GENERATION);
    });

    it('spreadsheet input → EXTRACT_FIRST', () => {
      const decision = manager.select({
        ...base,
        modalityIn: [ModalityKind.SPREADSHEET_INPUT],
      });
      expect(decision.workflowKind).toBe(WorkflowKind.EXTRACT_FIRST);
    });
  });

  describe('intent routing', () => {
    it('"compare X and Y" → COMPARE_ENSEMBLE with compareRecommended', () => {
      const decision = manager.select({
        ...base,
        messageContent: 'Compare React and Vue for our new project',
      });
      expect(decision.workflowKind).toBe(WorkflowKind.COMPARE_ENSEMBLE);
      expect(decision.compareRecommended).toBe(true);
    });

    it('"X vs Y" → COMPARE_ENSEMBLE', () => {
      const decision = manager.select({
        ...base,
        messageContent: 'GraphQL vs REST: which to pick?',
      });
      expect(decision.workflowKind).toBe(WorkflowKind.COMPARE_ENSEMBLE);
    });

    it('"summarize the latest" → SEARCH_FIRST with searchRecommended', () => {
      const decision = manager.select({
        ...base,
        messageContent: 'Summarize the latest 2025 ASCO oncology guidelines.',
      });
      expect(decision.workflowKind).toBe(WorkflowKind.SEARCH_FIRST);
      expect(decision.searchRecommended).toBe(true);
    });

    it('coding review intent → CODE_REVIEW with judgeRecommended on non-LOW risk', () => {
      const decision = manager.select({
        ...base,
        domain: DomainTag.CODING,
        riskLevel: RiskLevel.MEDIUM,
        messageContent: 'Review this code for security issues.',
      });
      expect(decision.workflowKind).toBe(WorkflowKind.CODE_REVIEW);
      expect(decision.judgeRecommended).toBe(true);
    });
  });

  describe('high-risk gating', () => {
    it('MEDICAL + HIGH risk → JUDGE_PIPELINE', () => {
      const decision = manager.select({
        ...base,
        domain: DomainTag.MEDICAL,
        riskLevel: RiskLevel.HIGH,
        messageContent: 'Drug interaction question',
      });
      expect(decision.workflowKind).toBe(WorkflowKind.JUDGE_PIPELINE);
      expect(decision.judgeRecommended).toBe(true);
    });

    it('LEGAL + HIGH risk → JUDGE_PIPELINE', () => {
      const decision = manager.select({
        ...base,
        domain: DomainTag.LEGAL,
        riskLevel: RiskLevel.HIGH,
        messageContent: 'Review my contract',
      });
      expect(decision.workflowKind).toBe(WorkflowKind.JUDGE_PIPELINE);
    });

    it('MENTAL_HEALTH + CRITICAL → JUDGE_PIPELINE', () => {
      const decision = manager.select({
        ...base,
        domain: DomainTag.MENTAL_HEALTH,
        riskLevel: RiskLevel.CRITICAL,
        messageContent: 'I feel hopeless',
      });
      expect(decision.workflowKind).toBe(WorkflowKind.JUDGE_PIPELINE);
    });

    it('CODING + HIGH risk does NOT trigger JUDGE_PIPELINE', () => {
      const decision = manager.select({
        ...base,
        domain: DomainTag.CODING,
        riskLevel: RiskLevel.HIGH,
        messageContent: 'Help debug this function',
      });
      expect(decision.workflowKind).toBe(WorkflowKind.DIRECT_LLM);
    });
  });

  describe('default fallback', () => {
    it('plain coding question → DIRECT_LLM', () => {
      const decision = manager.select({
        ...base,
        domain: DomainTag.CODING,
        messageContent: 'How do I write a generic function in TypeScript?',
      });
      expect(decision.workflowKind).toBe(WorkflowKind.DIRECT_LLM);
      expect(decision.reasonTags).toContain('default_direct');
    });
  });

  describe('priority', () => {
    it('PDF wins over COMPARE keyword', () => {
      const decision = manager.select({
        ...base,
        modalityIn: [ModalityKind.PDF_INPUT],
        messageContent: 'Compare these two PDFs',
      });
      expect(decision.workflowKind).toBe(WorkflowKind.PDF_EXTRACTION);
    });
  });
});
