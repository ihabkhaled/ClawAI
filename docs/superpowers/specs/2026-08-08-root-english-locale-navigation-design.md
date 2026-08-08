# Root English Locale Navigation Design

## Goal

Serve the English marketing homepage directly at `/` without an HTTP redirect, while preserving the localized `/en` and `/ar` routes and making language-switch navigation visibly pending.

## Routing behavior

- `GET /` and `HEAD /` continue through middleware without locale-prefix redirection.
- The root request receives the default English locale header so the existing root layout and marketing components render the English dictionary.
- `/en` continues to rewrite internally to the homepage with the English locale.
- `/ar` and every other supported locale prefix continue to rewrite internally with their selected locale.
- Existing unprefixed non-root human routes, such as `/contact`, continue redirecting permanently to `/en/contact`.
- Supported uppercase locale segments continue redirecting to their lowercase canonical form.
- `/` remains indexable and receives the existing homepage metadata. Canonical and alternate-language metadata remain governed by the current SEO utilities.

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

- Middleware test: `/` returns without redirect, carries the English locale request header, and remains indexable.
- Middleware regression tests: `/en`, `/ar`, `/contact`, and uppercase locale behavior remain intact.
- Hook tests: selecting another locale sets pending before navigation; selecting the current locale is a no-op.
- Component tests: pending state disables the trigger and displays an accessible loading overlay.
- Run frontend typecheck, lint, targeted tests, full frontend tests, build, and Lighthouse assertions required for public-page changes.

## Non-goals

- Do not remove locale-prefixed English URLs.
- Do not make every unprefixed marketing page directly render English.
- Do not change locale dictionaries or add new user-facing copy.
- Do not alter portal locale preference persistence.
