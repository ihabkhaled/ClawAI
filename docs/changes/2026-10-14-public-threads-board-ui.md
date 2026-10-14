# Public Threads board for guests: the page, search UI, sign-in prompts and navigation (2026-10-14)

**Why.** Guests could not browse the Threads that members publish unless they already had a link. The owner wants a clear, easy-to-find, read-only Board in the marketing site with the same smart search as the in-app Board. The SEO, registry and copy slice is in [public-threads-board](2026-10-14-public-threads-board.md); the guest read endpoints are in threads-service. This change is the frontend: the page, the guest mode of the Board components, the prompts and the links.

**What.**

- `/threads/board` page (marketing group): server-rendered first page (`revalidate: 60`), URL state `?q &sort &lang &type &page`, `noindex, follow` for any filtered view or page after the first, JSON-LD from `buildPublicBoardJsonLd`.
- A mode (`ThreadBoardMode`, React context) on the existing Board components instead of a copy: guest repository (`/public/board`, `/public/board/suggest`) with a field whitelist, guest default language `all`, cards and suggestions open `/<locale>/threads/<slug>`, no portal list-URL memory.
- Read-only: a banner with sign-in and sign-up links on the guest Board; on the public Thread page, "Sign in to like / comment / request a change / report" links next to the counts and comments.
- Findability: "Threads board" with an icon in the desktop header and the mobile menu, a footer link (replaces the "Public Threads" footer link), a home page section after the Threads band, and "Back to all Threads" on every public Thread page.
- Proxy: `/<locale>/threads/<slug>` is now a public route (it was tagged `X-Robots-Tag: noindex` by the proxy, which overrode the page's index directive).
- Strings: 15 `chat.threadBoardGuest*` keys in 13 locales.

**Decisions.**

| Question            | Default chosen                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Where               | `/threads/board` (`/threads` is the owner's portal list, so the board cannot live there); `/threads/discover` stays |
| Default language    | All languages for guests (members keep their UI locale)                                                             |
| Bookmark prompt     | None: Threads has no bookmark action yet, so there is nothing to sign in for                                        |
| Footer              | The board replaces the "Public Threads" link; discover is still linked from the Threads pages                       |
| Failed server fetch | Client loads the page itself and shows an error with Retry, never "no Threads"                                      |

**Risks.** Not seen in a browser or at 360 / 768 / 1280 px, in dark mode or in RTL: the layout is the member Board's, but nobody has looked. The header nav gains a seventh entry; check it at 1280 px in German and Russian. The endpoints `/public/board` and `/public/board/suggest` must be deployed before the page (until then the page shows its error state). Translations of the new strings are first-pass; a native review is advised.
