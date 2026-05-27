import { Test, type TestingModule } from '@nestjs/testing';

import { RoutingMode, WorkflowKind } from '../../../generated/prisma';
import type { SemanticIntentAnalysis } from '../../intelligence/types/semantic-intent-analysis.types';
import {
  LIVE_WORKFLOWS,
  SEARCH_FIRST_TRIGGER_KEYWORDS,
  WORKFLOW_REASON_DEFAULT_DIRECT,
  WORKFLOW_REASON_KEYWORD_FRESH_INFO_MARKER,
  WORKFLOW_REASON_NOT_LIVE,
  WORKFLOW_REASON_SEMANTIC_INTENT_REQUIRES_SEARCH,
} from '../constants/live-workflow-selector.constants';
import { LiveWorkflowSelectorManager } from '../managers/live-workflow-selector.manager';
import type { WorkflowSelectorInput } from '../types/live-workflow-selector.types';

function makeSemantic(
  overrides: Partial<SemanticIntentAnalysis> = {},
): SemanticIntentAnalysis {
  return {
    primaryIntent: 'qa',
    secondaryIntents: [],
    taskType: 'qa',
    domainTags: ['GENERAL'],
    roleTags: [],
    majorTags: [],
    modalityNeeds: ['TEXT'],
    expectedOutputType: 'text',
    requiresSearch: false,
    requiresExtraction: false,
    requiresFileAnalysis: false,
    requiresImageAnalysis: false,
    requiresVideoAnalysis: false,
    requiresAudioTranscription: false,
    requiresSpreadsheetAnalysis: false,
    requiresToolCalling: false,
    requiresStreaming: false,
    requiresLongContext: false,
    requiresStructuredOutput: false,
    requiresJudge: false,
    requiresCompare: false,
    privacyClass: 'unknown',
    riskLevel: 'LOW',
    confidence: 0.7,
    reasoningSummary: 'test',
    uncertaintyReasons: [],
    ...overrides,
  };
}

function baseInput(overrides: Partial<WorkflowSelectorInput> = {}): WorkflowSelectorInput {
  return {
    message: 'hello',
    routingMode: RoutingMode.AUTO,
    semanticIntent: null,
    keywordSignals: [],
    attachmentMimeTypes: [],
    ...overrides,
  };
}

describe('LiveWorkflowSelectorManager', () => {
  let manager: LiveWorkflowSelectorManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LiveWorkflowSelectorManager],
    }).compile();
    manager = module.get<LiveWorkflowSelectorManager>(LiveWorkflowSelectorManager);
  });

  describe('semantic intent rule', () => {
    it('SEARCH_FIRST when semanticIntent.requiresSearch=true', () => {
      const result = manager.selectWorkflow(
        baseInput({
          message: 'how does claude opus pricing work',
          semanticIntent: makeSemantic({ requiresSearch: true }),
        }),
      );
      expect(result.kind).toBe(WorkflowKind.SEARCH_FIRST);
      expect(result.reason).toBe(WORKFLOW_REASON_SEMANTIC_INTENT_REQUIRES_SEARCH);
    });

    it('semantic intent override wins when keywords are absent', () => {
      // No fresh-info markers in the message, but the analyzer flagged it.
      const result = manager.selectWorkflow(
        baseInput({
          message: 'compare claude opus to gpt 5 on coding benchmarks',
          semanticIntent: makeSemantic({ requiresSearch: true }),
        }),
      );
      expect(result.kind).toBe(WorkflowKind.SEARCH_FIRST);
    });

    it('semantic intent requiresSearch=false does NOT force SEARCH_FIRST', () => {
      const result = manager.selectWorkflow(
        baseInput({
          message: 'write me a haiku about lions',
          semanticIntent: makeSemantic({ requiresSearch: false }),
        }),
      );
      expect(result.kind).toBe(WorkflowKind.DIRECT_LLM);
    });
  });

  describe('keyword fresh-info markers', () => {
    it.each(SEARCH_FIRST_TRIGGER_KEYWORDS.map((kw) => [kw]))(
      'trigger keyword "%s" selects SEARCH_FIRST',
      (kw) => {
        const result = manager.selectWorkflow(
          baseInput({ message: `What is the openai news ${kw}?` }),
        );
        expect(result.kind).toBe(WorkflowKind.SEARCH_FIRST);
        expect(result.reason).toBe(WORKFLOW_REASON_KEYWORD_FRESH_INFO_MARKER);
      },
    );

    it('plural form "newest" triggers via matchKeyword plural tolerance', () => {
      const result = manager.selectWorkflow(
        baseInput({ message: 'what are the newest claude models' }),
      );
      expect(result.kind).toBe(WorkflowKind.SEARCH_FIRST);
    });

    it('substring inside an unrelated word does NOT trigger (no panda-NDA bug)', () => {
      // "today" inside "todays-newsletter" (a slug, not a real word) should
      // still trigger because the hyphen is a word boundary and "todays"
      // is a real word that matches the plural-tolerance regex. The
      // anti-substring guarantee we care about is that "today" inside
      // "todaymorningreport" (no boundary) does NOT trigger.
      const result = manager.selectWorkflow(
        baseInput({ message: 'tellmeaboutthetodaymorningreport' }),
      );
      expect(result.kind).toBe(WorkflowKind.DIRECT_LLM);
    });

    it('past-tense prompt without freshness marker → DIRECT_LLM', () => {
      const result = manager.selectWorkflow(
        baseInput({ message: 'what happened in world war two between 1939 and 1945' }),
      );
      expect(result.kind).toBe(WorkflowKind.DIRECT_LLM);
    });

    it('empty message defaults to DIRECT_LLM', () => {
      const result = manager.selectWorkflow(baseInput({ message: '' }));
      expect(result.kind).toBe(WorkflowKind.DIRECT_LLM);
    });

    it('case-insensitive keyword match', () => {
      const result = manager.selectWorkflow(
        baseInput({ message: 'WHAT IS LATEST IN AI?' }),
      );
      expect(result.kind).toBe(WorkflowKind.SEARCH_FIRST);
    });

    it('multi-word phrase "this week" triggers', () => {
      const result = manager.selectWorkflow(
        baseInput({ message: 'summarize anthropic announcements this week' }),
      );
      expect(result.kind).toBe(WorkflowKind.SEARCH_FIRST);
    });

    it('multi-word phrase "as of" triggers', () => {
      const result = manager.selectWorkflow(
        baseInput({ message: 'what is the population of japan as of 2026' }),
      );
      expect(result.kind).toBe(WorkflowKind.SEARCH_FIRST);
    });
  });

  describe('alternatives list', () => {
    it('lists every other WorkflowKind as available=false / reason=NOT_LIVE', () => {
      const result = manager.selectWorkflow(baseInput({ message: 'hello' }));
      const allKinds = Object.values(WorkflowKind) as WorkflowKind[];
      // Exactly one less than the full enum since the chosen kind is omitted.
      expect(result.alternatives).toHaveLength(allKinds.length - 1);
      for (const alt of result.alternatives) {
        expect(alt.reason).toBe(WORKFLOW_REASON_NOT_LIVE);
        if (LIVE_WORKFLOWS.includes(alt.workflow)) {
          expect(alt.available).toBe(true);
        } else {
          expect(alt.available).toBe(false);
        }
      }
    });

    it('chosen workflow does NOT appear in alternatives', () => {
      const result = manager.selectWorkflow(
        baseInput({ message: 'latest claude opus news' }),
      );
      expect(result.kind).toBe(WorkflowKind.SEARCH_FIRST);
      expect(result.alternatives.find((a) => a.workflow === WorkflowKind.SEARCH_FIRST)).toBeUndefined();
    });

    it('PDF_EXTRACTION is always marked unavailable today', () => {
      const result = manager.selectWorkflow(baseInput());
      const pdf = result.alternatives.find((a) => a.workflow === WorkflowKind.PDF_EXTRACTION);
      expect(pdf).toBeDefined();
      expect(pdf?.available).toBe(false);
    });

    it('IMAGE_ANALYSIS is always marked unavailable today', () => {
      const result = manager.selectWorkflow(baseInput());
      const img = result.alternatives.find((a) => a.workflow === WorkflowKind.IMAGE_ANALYSIS);
      expect(img).toBeDefined();
      expect(img?.available).toBe(false);
    });

    it('JUDGE_PIPELINE is always marked unavailable in this selector (lives in chat-service execution)', () => {
      const result = manager.selectWorkflow(baseInput());
      const judge = result.alternatives.find(
        (a) => a.workflow === WorkflowKind.JUDGE_PIPELINE,
      );
      expect(judge).toBeDefined();
      expect(judge?.available).toBe(false);
    });

    it('DIRECT_LLM appears as available alternative when SEARCH_FIRST is chosen', () => {
      const result = manager.selectWorkflow(
        baseInput({ message: 'latest claude news' }),
      );
      const direct = result.alternatives.find((a) => a.workflow === WorkflowKind.DIRECT_LLM);
      expect(direct).toBeDefined();
      expect(direct?.available).toBe(true);
    });

    it('SEARCH_FIRST appears as available alternative when DIRECT_LLM is chosen', () => {
      const result = manager.selectWorkflow(baseInput({ message: 'how do hash maps work' }));
      const search = result.alternatives.find(
        (a) => a.workflow === WorkflowKind.SEARCH_FIRST,
      );
      expect(search).toBeDefined();
      expect(search?.available).toBe(true);
    });
  });

  describe('privacy independence', () => {
    it('PRIVACY_FIRST routingMode still allows SEARCH_FIRST selection', () => {
      const result = manager.selectWorkflow(
        baseInput({
          message: 'what is the latest privacy law in EU',
          routingMode: RoutingMode.PRIVACY_FIRST,
        }),
      );
      // Workflow selection is independent of privacy — the router still
      // decides the model, but the workflow can still be SEARCH_FIRST
      // (against a self-hosted SearXNG, for example).
      expect(result.kind).toBe(WorkflowKind.SEARCH_FIRST);
    });

    it('LOCAL_ONLY routingMode still allows SEARCH_FIRST selection', () => {
      const result = manager.selectWorkflow(
        baseInput({
          message: 'breaking news today on kubernetes',
          routingMode: RoutingMode.LOCAL_ONLY,
        }),
      );
      expect(result.kind).toBe(WorkflowKind.SEARCH_FIRST);
    });
  });

  describe('default fallback', () => {
    it('a normal coding question with no markers → DIRECT_LLM', () => {
      const result = manager.selectWorkflow(
        baseInput({ message: 'how do I write a generic function in typescript' }),
      );
      expect(result.kind).toBe(WorkflowKind.DIRECT_LLM);
      expect(result.reason).toBe(WORKFLOW_REASON_DEFAULT_DIRECT);
    });

    it('greeting → DIRECT_LLM', () => {
      const result = manager.selectWorkflow(baseInput({ message: 'hello there' }));
      expect(result.kind).toBe(WorkflowKind.DIRECT_LLM);
    });

    it('long technical prompt without markers → DIRECT_LLM', () => {
      const result = manager.selectWorkflow(
        baseInput({
          message:
            'Explain the chain of trust in PKI and how a browser validates a TLS server certificate end to end',
        }),
      );
      expect(result.kind).toBe(WorkflowKind.DIRECT_LLM);
    });
  });

  describe('priority — semantic intent vs keyword', () => {
    it('semantic intent requiresSearch=true beats fresh-info keywords (same outcome, reason wins)', () => {
      const result = manager.selectWorkflow(
        baseInput({
          message: 'latest claude opus news today',
          semanticIntent: makeSemantic({ requiresSearch: true }),
        }),
      );
      expect(result.kind).toBe(WorkflowKind.SEARCH_FIRST);
      // Semantic intent rule fires first.
      expect(result.reason).toBe(WORKFLOW_REASON_SEMANTIC_INTENT_REQUIRES_SEARCH);
    });

    it('null semanticIntent falls through to keyword rule', () => {
      const result = manager.selectWorkflow(
        baseInput({
          message: 'what is happening right now in tech',
          semanticIntent: null,
        }),
      );
      expect(result.kind).toBe(WorkflowKind.SEARCH_FIRST);
      expect(result.reason).toBe(WORKFLOW_REASON_KEYWORD_FRESH_INFO_MARKER);
    });
  });
});
