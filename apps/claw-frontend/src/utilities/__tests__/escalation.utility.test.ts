import { describe, expect, it, vi } from 'vitest';

import { EscalationChainStatus } from '@/enums/escalation-chain-status.enum';
import type { EscalationChainStep } from '@/types';
import {
  getEscalationStatusBadgeVariant,
  getEscalationStatusLabel,
  isModelInChain,
} from '@/utilities/escalation.utility';

// ---------------------------------------------------------------------------
// isModelInChain
// ---------------------------------------------------------------------------

describe('isModelInChain', () => {
  const chain: EscalationChainStep[] = [
    { provider: 'OPENAI', model: 'gpt-4o-mini' },
    { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
    { provider: 'GOOGLE', model: 'gemini-2.5-flash' },
  ];

  it('returns true when provider and model both match a step', () => {
    expect(isModelInChain(chain, 'OPENAI', 'gpt-4o-mini')).toBe(true);
  });

  it('returns true for a step in the middle of the chain', () => {
    expect(isModelInChain(chain, 'ANTHROPIC', 'claude-sonnet-4')).toBe(true);
  });

  it('returns true for the last step in the chain', () => {
    expect(isModelInChain(chain, 'GOOGLE', 'gemini-2.5-flash')).toBe(true);
  });

  it('returns false when provider matches but model does not', () => {
    expect(isModelInChain(chain, 'OPENAI', 'gpt-4o')).toBe(false);
  });

  it('returns false when model matches but provider does not', () => {
    expect(isModelInChain(chain, 'DEEPSEEK', 'gpt-4o-mini')).toBe(false);
  });

  it('returns false when neither provider nor model match', () => {
    expect(isModelInChain(chain, 'DEEPSEEK', 'deepseek-r1')).toBe(false);
  });

  it('returns false for an empty chain', () => {
    expect(isModelInChain([], 'OPENAI', 'gpt-4o-mini')).toBe(false);
  });

  it('is case-sensitive — lowercase provider does not match uppercase enum value', () => {
    expect(isModelInChain(chain, 'openai', 'gpt-4o-mini')).toBe(false);
  });

  it('handles a single-element chain correctly (match)', () => {
    const singleChain: EscalationChainStep[] = [{ provider: 'ANTHROPIC', model: 'claude-opus-4' }];
    expect(isModelInChain(singleChain, 'ANTHROPIC', 'claude-opus-4')).toBe(true);
  });

  it('handles a single-element chain correctly (no match)', () => {
    const singleChain: EscalationChainStep[] = [{ provider: 'ANTHROPIC', model: 'claude-opus-4' }];
    expect(isModelInChain(singleChain, 'ANTHROPIC', 'claude-sonnet-4')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getEscalationStatusBadgeVariant
// ---------------------------------------------------------------------------

describe('getEscalationStatusBadgeVariant', () => {
  it('returns "default" for SINGLE_STEP', () => {
    expect(getEscalationStatusBadgeVariant(EscalationChainStatus.SINGLE_STEP)).toBe('default');
  });

  it('returns "secondary" for RESOLVED_AT_STEP', () => {
    expect(getEscalationStatusBadgeVariant(EscalationChainStatus.RESOLVED_AT_STEP)).toBe(
      'secondary',
    );
  });

  it('returns "destructive" for EXHAUSTED', () => {
    expect(getEscalationStatusBadgeVariant(EscalationChainStatus.EXHAUSTED)).toBe('destructive');
  });

  it('covers all three enum values without falling through', () => {
    const allStatuses = Object.values(EscalationChainStatus);
    const validVariants = ['default', 'secondary', 'destructive', 'outline'];
    for (const status of allStatuses) {
      const variant = getEscalationStatusBadgeVariant(status);
      expect(validVariants).toContain(variant);
    }
  });
});

// ---------------------------------------------------------------------------
// getEscalationStatusLabel
// ---------------------------------------------------------------------------

describe('getEscalationStatusLabel', () => {
  const t = vi.fn((key: string) => `translated:${key}`);

  it('calls t with "escalation.statusSingleStep" for SINGLE_STEP', () => {
    const label = getEscalationStatusLabel(EscalationChainStatus.SINGLE_STEP, t);
    expect(t).toHaveBeenCalledWith('escalation.statusSingleStep');
    expect(label).toBe('translated:escalation.statusSingleStep');
  });

  it('calls t with "escalation.statusResolved" for RESOLVED_AT_STEP', () => {
    t.mockClear();
    const label = getEscalationStatusLabel(EscalationChainStatus.RESOLVED_AT_STEP, t);
    expect(t).toHaveBeenCalledWith('escalation.statusResolved');
    expect(label).toBe('translated:escalation.statusResolved');
  });

  it('calls t with "escalation.statusExhausted" for EXHAUSTED', () => {
    t.mockClear();
    const label = getEscalationStatusLabel(EscalationChainStatus.EXHAUSTED, t);
    expect(t).toHaveBeenCalledWith('escalation.statusExhausted');
    expect(label).toBe('translated:escalation.statusExhausted');
  });

  it('returns the string returned by the t function', () => {
    const customT = (key: string) => `[${key}]`;
    expect(getEscalationStatusLabel(EscalationChainStatus.SINGLE_STEP, customT)).toBe(
      '[escalation.statusSingleStep]',
    );
  });
});
