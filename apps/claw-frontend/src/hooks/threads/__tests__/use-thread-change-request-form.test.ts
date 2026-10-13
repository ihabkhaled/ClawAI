import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useThreadChangeRequestForm } from '../use-thread-change-request-form';

const SOURCE = {
  markdown: '# Article\n\nCurrent draft.',
  citations: [{ evidenceId: 'e-1', url: 'https://source.example/a' }],
  judgeScore: 90,
  criticScore: 86,
};

describe('useThreadChangeRequestForm', () => {
  it('starts with nothing accepted and no replies', () => {
    const { result } = renderHook(() => useThreadChangeRequestForm(SOURCE));

    expect(result.current.acceptingRequestId).toBe('');
    expect(result.current.ownerResponses).toEqual({});
    expect(result.current.revisionMarkdown).toBe('');
  });

  it('copies the draft in when acceptance begins and sees an edit as a change', () => {
    const { result } = renderHook(() => useThreadChangeRequestForm(SOURCE));

    act(() => result.current.beginAcceptance('r-1'));
    expect(result.current.acceptingRequestId).toBe('r-1');
    expect(result.current.revisionMarkdown).toBe(SOURCE.markdown);
    expect(result.current.revisionChanged).toBe(false);

    act(() => result.current.setRevisionMarkdown('# Article\n\nClarified.'));
    expect(result.current.revisionChanged).toBe(true);
  });

  it('ignores trailing whitespace when deciding whether the draft changed', () => {
    const { result } = renderHook(() => useThreadChangeRequestForm(SOURCE));

    act(() => result.current.beginAcceptance('r-1'));
    act(() => result.current.setRevisionMarkdown(`${SOURCE.markdown}\n\n`));

    expect(result.current.revisionChanged).toBe(false);
  });

  it('keeps a reply per request independent', () => {
    const { result } = renderHook(() => useThreadChangeRequestForm(SOURCE));

    act(() => result.current.setOwnerResponse('r-1', 'Thanks'));
    act(() => result.current.setOwnerResponse('r-2', 'Out of scope'));

    expect(result.current.ownerResponses).toEqual({ 'r-1': 'Thanks', 'r-2': 'Out of scope' });
  });

  it('clears one request and leaves the others when it is answered', () => {
    const { result } = renderHook(() => useThreadChangeRequestForm(SOURCE));
    act(() => result.current.setOwnerResponse('r-1', 'Thanks'));
    act(() => result.current.setOwnerResponse('r-2', 'Later'));
    act(() => result.current.beginAcceptance('r-1'));
    act(() => result.current.setSpendCapUsd('0.5'));

    act(() => result.current.finishRequest('r-1'));

    expect(result.current.acceptingRequestId).toBe('');
    expect(result.current.spendCapUsd).toBe('');
    expect(result.current.ownerResponses).toEqual({ 'r-2': 'Later' });
  });

  it('cancels acceptance without losing the typed reply', () => {
    const { result } = renderHook(() => useThreadChangeRequestForm(SOURCE));
    act(() => result.current.setOwnerResponse('r-1', 'Thanks'));
    act(() => result.current.beginAcceptance('r-1'));

    act(() => result.current.cancelAcceptance());

    expect(result.current.acceptingRequestId).toBe('');
    expect(result.current.ownerResponses).toEqual({ 'r-1': 'Thanks' });
  });

  it('never reports a change when there is no draft to revise', () => {
    const { result } = renderHook(() => useThreadChangeRequestForm(null));

    act(() => result.current.beginAcceptance('r-1'));
    act(() => result.current.setRevisionMarkdown('anything'));

    expect(result.current.revisionChanged).toBe(false);
  });
});
