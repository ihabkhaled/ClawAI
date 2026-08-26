import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { FEEDBACK_LAUNCHER_CLASSES } from '@/constants/feedback.constants';
import {
  FLOATING_ACTION_DESKTOP_BOTTOM,
  FLOATING_ACTION_RAIL_SLOT_ONE,
  FLOATING_ACTION_RAIL_SLOT_TWO,
} from '@/constants/floating-action.constants';

// The chat page pins a "new thread" FAB to the bottom-end corner and the portal
// shell pins the feedback launcher to the same corner. Both were written with
// their own offsets, and both landed on 5rem above the bottom — `bottom-20` on
// one side, `nav (4rem) + 1rem` on the other. On mobile the launcher (z-40) sat
// exactly on top of the FAB (z-30) and ate every tap meant for it.
const CHAT_PAGE = resolve(__dirname, '../../../app/(portal)/chat/page.tsx');

function bottomOffsetOf(classes: string): string | undefined {
  return classes.split(' ').find((candidate) => candidate.startsWith('bottom-'));
}

describe('mobile floating action rail', () => {
  it('gives the two floating actions different slots', () => {
    const slotOne = bottomOffsetOf(FLOATING_ACTION_RAIL_SLOT_ONE);
    const slotTwo = bottomOffsetOf(FLOATING_ACTION_RAIL_SLOT_TWO);

    expect(slotOne).toBeDefined();
    expect(slotTwo).toBeDefined();
    expect(slotOne).not.toEqual(slotTwo);
  });

  it('leaves a whole slot height between them so the buttons cannot touch', () => {
    // Slot one clears the nav by 1rem; slot two clears slot one by the FAB
    // diameter (3.5rem) plus 1rem of air.
    expect(FLOATING_ACTION_RAIL_SLOT_ONE).toContain('+1rem)');
    expect(FLOATING_ACTION_RAIL_SLOT_TWO).toContain('+5.5rem)');
  });

  it('mirrors for RTL instead of pinning to the physical right edge', () => {
    for (const slot of [FLOATING_ACTION_RAIL_SLOT_ONE, FLOATING_ACTION_RAIL_SLOT_TWO]) {
      expect(slot).toContain('end-4');
      expect(slot).not.toContain('right-');
    }
    expect(FEEDBACK_LAUNCHER_CLASSES).not.toContain('right-');
  });

  it('puts the global feedback launcher in slot two, above the page action', () => {
    expect(FEEDBACK_LAUNCHER_CLASSES).toContain(FLOATING_ACTION_RAIL_SLOT_TWO);
    expect(FEEDBACK_LAUNCHER_CLASSES).toContain(FLOATING_ACTION_DESKTOP_BOTTOM);
  });

  // Asserted against the file rather than a render: the FAB only exists inside
  // the chat page's JSX, and the point of the test is that this one control
  // takes its offset from the shared rail instead of inventing another one.
  it('puts the chat new-thread button in slot one', () => {
    const source = readFileSync(CHAT_PAGE, 'utf8');

    expect(source).toContain('FLOATING_ACTION_RAIL_SLOT_ONE');
    expect(source).not.toContain('fixed bottom-20 end-4');
  });
});
