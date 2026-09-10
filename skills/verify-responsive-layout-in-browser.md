# Skill: Verify a Responsive Layout in a Browser

> Use this when a change alters how a page is laid out — a header, a composer,
> a shell, a grid. Unit tests assert that a class string is present. They cannot
> tell you the header wrapped to three rows at 1024 px, and that is the class of
> defect this skill exists to catch.

---

## When to use

- Any change to a layout container, a header, or an input that grows.
- Before claiming a responsive redesign is done. Rule 40's Definition of Done
  requires this pass by name.
- After a change that adds a control to a row that was already full.

**Do not** substitute a screenshot at one size, a unit test, or "it looks right
in my window". The failures live at the sizes you are not using.

## Before you start — the stack has to be real

The dev frontend is a container with a Windows bind mount. Turbopack does not
watch that mount reliably, so edits made on the host are not picked up until the
container restarts.

```bash
./scripts/claw.sh up -d            # the only supported way to start the stack
docker restart claw-frontend       # ALWAYS, after editing frontend source
```

The URL is `https://claw.local`, not `localhost:3000`. Sign in with the seeded
admin account. If the stack cannot be brought up, that is a **blocker to
report**, not a step to skip — say so explicitly and do not claim the layout is
verified.

**Then unregister the service worker, every single reload.** The portal is a
PWA. Its service worker caches the dev chunks and re-registers itself on the
next page load, so a container restart alone is not enough: the browser keeps
serving the _old_ module. This costs an hour if you do not know it, because the
page looks live — new markup renders while a stale module quietly supplies old
values. The symptom is a change that "half applied".

```js
// Run before every verification reload, then reload again.
if (window.caches) {
  const ks = await caches.keys();
  await Promise.all(ks.map((k) => caches.delete(k)));
}
const regs = await navigator.serviceWorker.getRegistrations();
await Promise.all(regs.map((r) => r.unregister()));
```

**Prove the new code is actually the code under test** before you measure
anything. Pick one thing only your change introduces — a new `aria-label`, a new
attribute, a new class — and assert it is in the DOM. If it is not, you are
measuring the old build and every number you take is fiction.

## The size matrix

Nine widths, chosen because each one breaks something different. Drive them with
Chrome DevTools device emulation or `mcp__plugin_playwright_playwright__browser_resize`.

| Size                  | What it catches                                                     |
| --------------------- | ------------------------------------------------------------------- |
| 375×812               | The narrowest real phone. Horizontal overflow, 44 px touch targets. |
| 390×844               | The common phone. Safe-area insets, keyboard behaviour.             |
| 768×1024              | Portrait tablet — the width where a header row usually first wraps. |
| 1024×768              | Landscape tablet. Short viewport: the height failures show here.    |
| 1280×800              | Small laptop.                                                       |
| 1366×768              | The most common laptop, and the least forgiving on height.          |
| 1440×900 · 1512×982   | Ordinary desktop.                                                   |
| 1920×1080 · 2560×1440 | Where an unbounded content column stops being readable.             |

Then zoom, at 1366×768: **80, 90, 100, 110, 125, 150 %**. Zoom changes the CSS
pixel viewport, so 150 % at 1366 is roughly a 910 px-wide layout — it exercises
breakpoints the size matrix alone does not. A layout that only works zoomed out
is not a responsive layout.

## What to check at every size

1. **No page-level horizontal scroll.** Assert it, do not eyeball it:

   ```js
   document.documentElement.scrollWidth <= document.documentElement.clientWidth;
   ```

2. **No wrapped header.** Compare the header's `offsetHeight` against one row.
3. **The scroll container got the height.** Measure it and record the number —
   a redesign that claims "more history" has to produce a bigger number than
   the one before it.
4. **Touch targets ≥ 44 px** at the two phone sizes, for every interactive
   element in the reach zone.
5. **Overflow lives in the right box.** A code block or a table scrolls inside
   its own container, never the page. `scrollWidth <= clientWidth` on the
   document is the weak version of this test — it passes even when a child
   overflows, because an ancestor clipped it. The strong version walks every
   element and reports only the ones whose overflow _no_ ancestor scrolls or
   clips:

   ```js
   const vw = document.documentElement.clientWidth;
   [...document.querySelectorAll('main *')].filter((el) => {
     const r = el.getBoundingClientRect();
     if (r.width === 0 || (r.right <= vw + 1 && r.left >= -1)) return false;
     for (let p = el.parentElement; p; p = p.parentElement) {
       const o = getComputedStyle(p).overflowX;
       if (o === 'hidden' || o === 'auto' || o === 'scroll') return false;
     }
     return true;
   });
   ```

6. **Nothing floating covers anything interactive.** Compare the bounding boxes
   of every `position: fixed` element against the controls underneath. A
   launcher, FAB or toast sitting on a send button is invisible to every test
   that only measures heights.

## The content states to try

A layout is a function of its content. Empty is the easy case.

- empty input · one line · multiline · a very long paste
- attachment chips present
- research enabled, with the longest provider name available
- a long assistant answer, a code block, a wide table
- a streaming answer, mid-stream
- a thread title long enough to need truncation
- the mobile keyboard open (emulation: focus the input on a phone size)
- an RTL locale (`ar`), which is where `left`/`right` assumptions surface

## Recording the evidence

Screenshots at a minimum of one phone, one tablet and one desktop size, plus the
measured numbers for anything the change claimed to improve. Numbers go in the
batch report; "looks better" is not a result.

## Definition of done

- [ ] Every size in the matrix was opened, not inferred from a neighbour.
- [ ] The zoom row was run at 1366×768.
- [ ] `scrollWidth <= clientWidth` holds at 375 px.
- [ ] The header is one row at every size.
- [ ] Before/after numbers exist for whatever the change claimed to improve.
- [ ] Screenshots captured at phone, tablet and desktop, and **looked at** —
      numbers do not show a clipped label or a scrollbar across a card.
- [ ] The service worker was unregistered and the new code proven present
      before any measurement was taken.
- [ ] No fixed-position element overlaps an interactive control.
- [ ] If the stack could not be started, that is reported as a blocker and no
      verification is claimed.

## See also

- [`rules/40-chat-surface-layout-and-composer.md`](../rules/40-chat-surface-layout-and-composer.md)
- [`docs/05-frontend/chat-surface-layout.md`](../docs/05-frontend/chat-surface-layout.md)
- [`skills/05-qa-toolkit.md`](05-qa-toolkit.md) — API-level QA scripts, the other half of the evidence
