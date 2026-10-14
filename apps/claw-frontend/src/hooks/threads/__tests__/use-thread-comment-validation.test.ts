import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useThreadCommentValidation } from '../use-thread-comment-validation';

describe('useThreadCommentValidation', () => {
  it.each(['', '   ', '\n\t '])('blocks submit for %j and flags it empty', (value) => {
    const submit = vi.fn();
    const { result } = renderHook(() => useThreadCommentValidation(value, submit, vi.fn()));

    act(() => result.current.handleSubmit());

    expect(submit).not.toHaveBeenCalled();
    expect(result.current.isEmpty).toBe(true);
  });

  it('submits real text and clears the flag when typing resumes', () => {
    const submit = vi.fn();
    const setComment = vi.fn();
    const { result, rerender } = renderHook(
      ({ text }) => useThreadCommentValidation(text, submit, setComment),
      { initialProps: { text: ' ' } },
    );
    act(() => result.current.handleSubmit());
    expect(result.current.isEmpty).toBe(true);

    act(() => result.current.handleChange('hi'));
    expect(setComment).toHaveBeenCalledWith('hi');
    expect(result.current.isEmpty).toBe(false);

    rerender({ text: 'hi' });
    act(() => result.current.handleSubmit());
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
