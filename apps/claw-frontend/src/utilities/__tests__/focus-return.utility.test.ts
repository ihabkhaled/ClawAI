import { afterEach, describe, expect, it } from 'vitest';

import { restoreFocusTo } from '@/utilities/focus-return.utility';

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 60));

describe('restoreFocusTo', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('focuses the remembered element once focus fell to body', async () => {
    document.body.innerHTML = '<button id="opener">Open</button>';
    const opener = document.getElementById('opener');

    restoreFocusTo(opener);
    await settle();

    expect(document.activeElement).toBe(opener);
  });

  it('does nothing for a null target', async () => {
    restoreFocusTo(null);
    await settle();

    expect(document.activeElement).toBe(document.body);
  });

  it('skips an element that left the document', async () => {
    document.body.innerHTML = '<button id="gone">Gone</button>';
    const gone = document.getElementById('gone');
    gone?.remove();

    restoreFocusTo(gone);
    await settle();

    expect(document.activeElement).toBe(document.body);
  });

  it('does not steal focus the user moved elsewhere', async () => {
    document.body.innerHTML = '<button id="a">A</button><input id="b" />';
    const a = document.getElementById('a');
    const b = document.getElementById('b');

    restoreFocusTo(a);
    b?.focus();
    await settle();

    expect(document.activeElement).toBe(b);
  });
});
