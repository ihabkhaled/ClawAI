# Fix a corrupted page layout (blank band, endless scroll, clipped top bar)

When: a portal page shows a blank band under the content, scrolls endlessly, or the top bar is pushed off screen.

1. Run `node apps/claw-frontend/scripts/responsive-audit/audit.cjs` on the page; read `page-overflow` / `page-vertical-overflow` rows.
2. In DevTools find what makes `document.documentElement.scrollHeight` or `scrollWidth` too large: look for `position:absolute` elements (`sr-only`, popovers, hidden cells) whose nearest positioned ancestor is above `PortalShell`.
3. Fix at the owner: add `relative` to the scroll box, `min-w-0` to the flex parent, or `overflow-x-auto` around the wide child. Never patch the symptom with `overflow-hidden` on the shell.
4. Add a class-contract test, rerun the audit at 320/768/1280/1920 plus Arabic, and update `docs/05-frontend/responsive-audit.md`.

Rule: `rules/62-portal-shell-must-never-scroll-as-a-document.md`.
