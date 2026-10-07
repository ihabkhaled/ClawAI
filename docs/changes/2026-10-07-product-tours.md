# Product tours (2026-10-07)

**Why.** Owner: a tour library for the Threads pages and for the chat module (choosing models, research, adding and creating context, turning a chat into a Thread, compare).

**What.** ADR-163. Ten tours, a help button in the top bar that lists this page's tours first, a first-visit offer that never auto-starts, and a card with a highlight window. Copy in 13 locales. `data-tour` attributes on the Threads list/create/review controls, the chat composer, model picker, research toggle, context buttons, credit badge, chat action rail and "More actions" menu, the compare page and the Context Packs page.

**Not changed.** No backend, API, database or permission. Tours never click for the person.

**Known limits.** The Thread-create tour shows centered cards while the create dialog is closed. The Context Packs tour cannot highlight its button for a user without `CONTEXT_PACK_READ_OWN`.

QA: `docs/qa-evidence/2026-10-07-product-tours.md` (PARTIAL).
