# Root English Locale Navigation Design

## Goal

Serve every registered public page directly in English when its URL has no locale prefix, while preserving all locale-prefixed routes and making language-switch navigation visibly pending.

## Routing behavior

- `GET` and `HEAD` requests for `/` and every registered public path continue through proxy middleware without locale-prefix redirection.
- Locale-less registered public requests receive the default English locale header so the existing layout and marketing components render the English dictionary.
- `/en` continues to rewrite internally to the homepage with the English locale.
- `/ar` and every other supported locale prefix continue to rewrite internally with their selected locale.
- `/contact`, `/learn`, `/learn/*`, `/integrations/*`, and every future published registry path work directly without redirecting to `/en/*`.
- Unknown, auth, and portal paths keep their existing fail-closed locale and indexability behavior.
- Supported uppercase locale segments continue redirecting to their lowercase canonical form.
- Locale-less English aliases remain indexable but canonical metadata and sitemap membership stay on `/en/*`, preventing duplicate discovery entries while both URL forms return content.

## Language-switch pending state

The public marketing language switcher owns one pending navigation state in its controller hook. Selecting a different locale:

1. marks navigation pending immediately;
2. persists the selected locale through the existing locale context;
3. replaces the current localized URL while preserving query parameters and hash;
4. renders a full-viewport loading overlay until the new route tree mounts;
5. disables the switcher while pending to prevent duplicate navigation.

The overlay uses the existing translated loading label, semantic theme tokens, an accessible live status, and reduced-motion-safe animation. Selecting the already-active locale performs no navigation and does not show the loader.

## Component boundaries

- `middleware.ts` owns root-path locale injection and redirect exceptions.
- `useMarketingLocaleSwitcher` owns public-switcher pending state and event handling.
- `MarketingLocaleSwitcher` remains render-only and receives pending state from its controller hook.
- A focused loading-overlay component renders the accessible full-page state.
- Existing locale navigation utilities continue owning URL replacement.

## Testing

- Proxy test: `/`, `/contact`, `/learn/*`, and `/integrations/*` return without redirect, carry the English locale request header, and remain indexable.
- Proxy regression tests: `/en`, `/ar`, unknown routes, private routes, and uppercase locale behavior remain intact.
- Hook tests: selecting another locale sets pending before navigation; selecting the current locale is a no-op.
- Component tests: pending state disables the trigger and displays an accessible loading overlay.
- Run frontend typecheck, lint, targeted tests, full frontend tests, build, and Lighthouse assertions required for public-page changes.

## Non-goals

- Do not remove locale-prefixed English URLs.
- Do not make unregistered, authenticated, or private application pages public.
- Do not add locale-less aliases to the sitemap or replace `/en/*` canonicals.
- Do not change locale dictionaries or add new user-facing copy.
- Do not alter portal locale preference persistence.
