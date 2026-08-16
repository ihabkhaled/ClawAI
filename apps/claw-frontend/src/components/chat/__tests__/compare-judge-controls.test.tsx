import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CompareJudgeControls } from '@/components/chat/compare-judge-controls';

const t = (key: string): string => key;

const baseProps = {
  judgeEnabled: false,
  onJudgeEnabledChange: vi.fn(),
  judgeModel: null,
  onJudgeModelChange: vi.fn(),
  judgeModelOptions: [
    { value: 'OPENAI:gpt-4.1', label: 'OPENAI · gpt-4.1' },
    { value: 'gemma3:4b', label: 'gemma3:4b' },
  ],
  judgeModelOptionsLoading: false,
  t,
};

describe('CompareJudgeControls', () => {
  it('renders the judge label and description', () => {
    render(<CompareJudgeControls {...baseProps} />);
    expect(screen.getByText('chat.judgeReferee')).toBeInTheDocument();
    expect(screen.getByText('chat.judgeRefereeDescription')).toBeInTheDocument();
  });

  it('hides the model picker when judge is OFF', () => {
    render(<CompareJudgeControls {...baseProps} judgeEnabled={false} />);
    expect(screen.queryByText('chat.judgeModelLabel')).not.toBeInTheDocument();
  });

  it('shows the model picker when judge is ON, listing every judge model option', () => {
    render(<CompareJudgeControls {...baseProps} judgeEnabled />);
    expect(screen.getByText('chat.judgeModelLabel')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('OPENAI · gpt-4.1')).toBeInTheDocument();
    expect(screen.getByText('gemma3:4b')).toBeInTheDocument();
  });

  it('calls onJudgeModelChange with the selected value', () => {
    const onJudgeModelChange = vi.fn();
    render(
      <CompareJudgeControls {...baseProps} judgeEnabled onJudgeModelChange={onJudgeModelChange} />,
    );

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('gemma3:4b'));

    expect(onJudgeModelChange).toHaveBeenCalledWith('gemma3:4b');
  });

  it('calls onJudgeEnabledChange when the switch is toggled', () => {
    const onChange = vi.fn();
    render(<CompareJudgeControls {...baseProps} onJudgeEnabledChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
