# Public Marketing and SEO Launch Design

## Product position

ClawAI is presented first as the simplest way for individuals and teams to use
multiple frontier AI models through one subscription. Private deployment for
organisations is a prominent, separate enterprise path rather than a competing
homepage message.

The public site must persuade with facts the repository can support. It must not
invent customer logos, testimonials, adoption figures, uptime, certifications,
benchmarks, or endorsements.

## Launch surface

The canonical public surface consists of the existing pages:

- Home
- Features
- How it works
- Architecture
- Private deployment
- Use cases
- FAQ
- Contact

and these launch pages:

- About
- Pricing
- Supported models
- Security and privacy
- Privacy policy
- Terms
- Cookies
- Acceptable use

Every page is available under all 13 supported locale prefixes. Authentication
and application routes remain noindex and absent from public discovery.

## Discovery architecture

The content registry remains the source of truth for navigation, metadata,
sitemaps, RSS, footer links, Lighthouse coverage, and indexability. Each
published locale carries a real localized title and description rather than an
English copy.

Every public page receives:

- a unique localized title and description;
- focused, natural keywords without stuffing;
- an absolute canonical URL;
- reciprocal hreflang links for 13 locales plus `x-default`;
- Open Graph and Twitter metadata with meaningful image alt text;
- index/follow directives only on the canonical production deployment;
- RSS autodiscovery;
- breadcrumb structured data where visible;
- page-specific structured data only when the visible content supports it.

`robots.txt` allows public content for standards-compliant crawlers, explicitly
disallows all private route families, and advertises the sitemap index.
`sitemap.xml` exhaustively lists all localized public pages and every eligible
public chat through child sitemaps. Localized RSS URLs must resolve correctly;
the combined feed contains public pages and eligible public chats, while the
topic and chat feeds remain separately discoverable.

## Conversion architecture

The primary signed-out action is account creation. Pricing actions preserve the
selected plan and billing interval through registration. The enterprise action
opens contact with enterprise intent preserved.

The homepage is a concise decision page, not a catalog. Dedicated pages carry
depth. Public shared chats include a restrained account-creation invitation
without enabling continuation, copying, or access to private data.

Trust comes from transparent model access, pricing, limitations, architecture,
security controls, legal policies, GitHub provenance, and review dates. Copy
must match actual entitlement behavior and must state uncertainty where the
application cannot guarantee an outcome.

## Visual system

The direction is premium technical editorial.

- **Ink:** `#111318`
- **Paper:** `#F6F3EC`
- **Signal red:** `#C92A2A`
- **Circuit blue:** `#2563EB`
- **Graphite:** `#596170`
- **Rule:** `#D8D3C8`

Display typography is assertive and compact; body typography remains highly
readable; labels and technical annotations use a mono role. The design uses
hairline rules, editorial side notes, outcome-led section introductions, and
diagrams derived from real product architecture.

The signature element is the **routing rail**: a visual path showing one request
being evaluated, routed, compared, and returned with a model receipt. It encodes
real product behavior and replaces generic decorative gradients.

Long pages gain local navigation and stronger hierarchy. Layouts remain usable
at 320px, tablet widths, desktop, dark mode, RTL, reduced motion, keyboard-only,
and high zoom.

## Accessibility and performance

- One visible `h1` and valid heading order on every page.
- Header and footer links are unique, locale-aware, and expose current-page
  state where applicable.
- Forms associate errors with controls, announce failures, and focus the first
  invalid field.
- Images are optimized and have meaningful alt text unless demonstrably
  decorative.
- Static marketing content should avoid unnecessary client hydration.
- Lighthouse gates cover every English launch page plus representative RTL and
  CJK pages on desktop and mobile.
- SEO, accessibility, and best-practices targets are 1.0 where Lighthouse
  supports deterministic assertions; performance remains evidence-based and
  must not regress below the repository budget.

## Verification

Tests enforce registry/route/sitemap parity, real locale metadata, rendered title
composition, localized RSS routing, feed coverage, robots private-prefix
coverage, structured-data language, footer uniqueness, responsive navigation,
form accessibility, and launch-page metadata.

The frontend validation lane is typecheck, lint, tests, production build,
Lighthouse, generated-knowledge verification, inventory audit, and live Vercel
deployment inspection.
