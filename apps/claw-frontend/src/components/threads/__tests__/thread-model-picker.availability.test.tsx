import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ThreadModelAvailability } from '@/enums/thread-model-availability.enum';
import type { ModelPickerProps } from '@/types';

import { ThreadModelPicker } from '../thread-model-picker';

let capturedProps: ModelPickerProps | null = null;

vi.mock('@/components/billing/credit-dual-consumption-notice', () => ({
  CreditDualConsumptionNotice: () => <span />,
}));
vi.mock('@/components/chat/model-picker', () => ({
  ModelPicker: (props: ModelPickerProps) => {
    capturedProps = props;
    return <div />;
  },
}));
vi.mock('@/hooks/chat/use-model-selector', () => ({
  useModelSelector: () => ({
    t: (key: string, params?: { plan?: string }) =>
      params?.plan === undefined ? key : `${key}|${params.plan}`,
    isLoading: false,
    groupedModels: [
      {
        provider: 'GEMINI',
        label: 'Gemini',
        models: [
          { provider: 'GEMINI', model: 'flash', displayName: 'Flash' },
          { provider: 'GEMINI', model: 'pro', displayName: 'Pro' },
          { provider: 'GEMINI', model: 'tiny', displayName: 'Tiny' },
          { provider: 'GEMINI', model: 'down', displayName: 'Down' },
        ],
      },
    ],
    groups: [
      {
        key: 'GEMINI',
        label: 'Gemini',
        options: ['flash', 'pro', 'tiny', 'down'].map((model) => ({
          value: `GEMINI::${model}`,
          label: model,
        })),
      },
    ],
  }),
}));

const availability = new Map([
  ['GEMINI::flash', ThreadModelAvailability.Available],
  ['GEMINI::pro', ThreadModelAvailability.NeedsPlan],
  ['GEMINI::tiny', ThreadModelAvailability.WindowTooSmall],
  ['GEMINI::down', ThreadModelAvailability.Unavailable],
]);

function renderPicker(onChange = vi.fn()) {
  render(
    <ThreadModelPicker
      id="role"
      label="Judge"
      value={{ provider: 'GEMINI', model: 'flash', displayName: 'Flash' }}
      onChange={onChange}
      availability={availability}
      planName="Free"
    />,
  );
  return onChange;
}

describe('ThreadModelPicker availability', () => {
  it('marks each unusable model with its own reason and leaves usable ones plain', () => {
    renderPicker();

    const labels = capturedProps?.groups[0]?.options.map((option) => option.label);
    expect(labels).toEqual([
      'flash',
      'pro (chat.threadTeam.reasonNeedsPlan|Free)',
      'tiny (chat.threadTeam.reasonWindow|Free)',
      'down (chat.threadTeam.reasonUnavailable|Free)',
    ]);
  });

  it('ignores a choice the account cannot use and accepts one it can', () => {
    const onChange = renderPicker();

    capturedProps?.onChange('GEMINI::pro');
    capturedProps?.onChange('GEMINI::tiny');
    capturedProps?.onChange('GEMINI::down');
    expect(onChange).not.toHaveBeenCalled();

    capturedProps?.onChange('GEMINI::flash');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ model: 'flash' }));
  });
});
