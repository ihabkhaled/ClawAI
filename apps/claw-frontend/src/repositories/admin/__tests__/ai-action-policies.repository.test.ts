import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiActionPolicyKind } from '@/enums/ai-action-policy-kind.enum';
import { RiskLabel } from '@/enums/risk-label.enum';
import {
  createAiActionPolicy,
  createSuggestionRule,
  deleteAiActionPolicy,
  deleteSuggestionRule,
  listAiActionPolicies,
  listSuggestionRules,
  updateAiActionPolicy,
  updateSuggestionRule,
} from '@/repositories/admin/ai-action-policies.repository';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe('ai-action-policies repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('policies', () => {
    it('list calls GET /workspace/ai-actions/policies', async () => {
      mockGet.mockResolvedValue({ data: [] });
      await listAiActionPolicies();
      expect(mockGet).toHaveBeenCalledWith('/workspace/ai-actions/policies');
    });

    it('create POSTs payload', async () => {
      mockPost.mockResolvedValue({ data: { id: 'p1' } });
      const dto = {
        name: 'custom',
        kind: AiActionPolicyKind.ALLOW,
        providerRegex: '.*',
        actionKindRegex: '.*',
        riskMaxLabel: RiskLabel.LOW,
        riskMaxScore: 30,
        priority: 500,
        requireReason: false,
        isActive: true,
      };
      await createAiActionPolicy(dto);
      expect(mockPost).toHaveBeenCalledWith('/workspace/ai-actions/policies', dto);
    });

    it('update PATCHes to encoded id', async () => {
      mockPatch.mockResolvedValue({ data: { id: 'p1' } });
      await updateAiActionPolicy('p 1', { isActive: false });
      expect(mockPatch).toHaveBeenCalledWith('/workspace/ai-actions/policies/p%201', {
        isActive: false,
      });
    });

    it('delete DELETEs encoded id', async () => {
      mockDelete.mockResolvedValue({ data: undefined });
      await deleteAiActionPolicy('p+1');
      expect(mockDelete).toHaveBeenCalledWith('/workspace/ai-actions/policies/p%2B1');
    });
  });

  describe('suggestion rules', () => {
    it('list calls GET /workspace/suggestion-rules', async () => {
      mockGet.mockResolvedValue({ data: [] });
      await listSuggestionRules();
      expect(mockGet).toHaveBeenCalledWith('/workspace/suggestion-rules');
    });

    it('create POSTs payload', async () => {
      mockPost.mockResolvedValue({ data: { id: 'r1' } });
      const dto = {
        name: 'custom-rule',
        eventType: 'workspace.webhook.received',
        actionKindToSuggest: 'SUMMARIZE',
      };
      await createSuggestionRule(dto);
      expect(mockPost).toHaveBeenCalledWith('/workspace/suggestion-rules', dto);
    });

    it('update PATCHes to encoded id', async () => {
      mockPatch.mockResolvedValue({ data: { id: 'r1' } });
      await updateSuggestionRule('r 1', { isActive: true });
      expect(mockPatch).toHaveBeenCalledWith('/workspace/suggestion-rules/r%201', {
        isActive: true,
      });
    });

    it('delete DELETEs encoded id', async () => {
      mockDelete.mockResolvedValue({ data: undefined });
      await deleteSuggestionRule('r/1');
      expect(mockDelete).toHaveBeenCalledWith('/workspace/suggestion-rules/r%2F1');
    });
  });
});
