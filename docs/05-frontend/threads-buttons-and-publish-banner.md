# Threads UI: label keys, buttons, publish banner and honest progress copy

How the Threads surfaces in `apps/claw-frontend` are built so they look like the rest of the product, read correctly in
13 locales and stay honest about what the job is doing. Batch 1 of the Threads board design.

## 1. Never build a translation key with a template string

`t()` returns the key itself when it does not resolve. Two components built the key from an enum value and dropped the
`chat.` prefix, so people saw `threadPublicReportSPAM` (report reason picker) and `threadChangeRequestPENDING` (owner
suggestion status) instead of words. No test noticed: the key-coverage test only matched `t('literal')`, and the
component tests mocked `t` as `key => key`, which echoes the raw key and passes.

The rule now:

- A key that depends on an enum goes through a literal map in `constants/thread-publication.constants.ts`:
  `THREAD_REPORT_REASON_LABEL_KEYS`, `THREAD_CHANGE_REQUEST_STATUS_LABEL_KEYS`. Each value is a full
  `chat.…` literal, so the key test can see it.
- `src/lib/i18n/__tests__/threads-translation-keys.test.ts` now (a) collects every `t('…')` literal **and** every quoted
  `chat.`/`common.` literal in the Threads components, hooks, constants, utilities and pages, and resolves them in all
  13 locales; (b) fails if any of those files passes a template literal to `t(`; (c) checks that each enum map covers
  every enum value and that its keys translate (not as the key) in every locale.
- Component tests for label-bearing components use the **real** dictionary
  (`resolveTranslation(en, key, params)`) instead of a key-echo mock. See `thread-public-report-form.test.tsx` and
  `thread-change-request-labels.test.tsx`.

Machine-code maps that already use a prefix plus a lookup (`chat.threadProgress.code.<key>`) are covered by
`constants/__tests__/thread-generation-code-keys.test.ts`.

## 2. After Publish: the live banner

`ThreadLiveBanner` (`components/threads/thread-live-banner.tsx`) replaces the one-line "Publication is live." It shows
when `publish.isSuccess` and the public address is known (`detail.publicUrl`, from the refetched `mine` list):

- success title and one sentence ("Anyone with this link can read it…"),
- the address in a read-only shared `Input` (focus selects it),
- **Open live Thread**: a link in a new tab (`noopener noreferrer`). There is no automatic redirect, so the owner keeps
  Unpublish, export and reader suggestions in reach and a screen reader keeps its place,
- **Copy link** with "Link copied" feedback and a copy-failed alert, through `useThreadShare`.

Until `publicUrl` is known (the list refetch is in flight) the old one-line status is shown. The banner exists only in
the session that published; a reload shows the normal share menu. Keys: `chat.threadLiveTitle`, `threadLiveBody`,
`threadLiveLinkLabel`, `threadLiveOpen` (13 locales); copy labels reuse `chat.threadShareCopy`/`threadShareCopied`.

## 3. Buttons, forms and layout

All from the shared components and lucide icons; no raw `input`/`textarea`/`checkbox` in these components.

| Surface                    | What changed                                                                                                                                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner progress panel       | Retry (RotateCcw), Cancel (Square, loading state), Delete (Trash2, destructive) in a bordered footer row; stacked full width below `sm`.                                                                                          |
| Publication detail         | One action bar: Edit draft (Pencil), Approve and publish (Rocket, large), Unpublish (EyeOff). Revision form uses `Textarea`/`Input`. Draft preview is a read-only `Textarea` (focusable, scrolls).                                |
| Export panel               | Format cards: shared `Checkbox` in a label card with a format icon (`THREAD_EXPORT_FORMAT_ICONS`); Download (Download icon, "ZIP" label when several), Save as PDF (Printer icon).                                                |
| Share menu                 | Copy link / native share buttons, then icon-only links per network with `aria-label` and `title`. Appearance in `constants/thread-share-platforms.constants.ts`.                                                                  |
| Community                  | Like / Dislike pills with ThumbsUp/ThumbsDown (filled when active, `aria-pressed`); clicking the active pill removes the reaction (the separate button is gone). Comment, suggestion and report controls use `Textarea`/`Button`. |
| Report form                | Shared `Select` with translated labels from the key map; value parsed by `parseThreadReportReason`.                                                                                                                               |
| Reader suggestions (owner) | Status `Badge` with accessible colours, Accept (Check) / Reject (X). State moved out of the TSX into `useThreadChangeRequests` (+ form and resolve hooks).                                                                        |

Share icons: lucide 1.x ships no brand logos. `thread-share-icons.tsx` has four small single-colour marks
(Facebook, LinkedIn, X, Reddit) drawn on a 24px grid with `currentColor`; WhatsApp, Telegram and Email use lucide
`MessageCircle`, `Send`, `Mail`. Resting colour is the theme's muted text; the brand colour appears on hover only.

Phone and RTL: action buttons are `w-full sm:w-auto` and keep the shared 44px touch size; spacing uses logical
utilities (`ms-auto`, `ps-`, `rtl:-scale-x-100` on directional icons).

## 4. Contrast

Axe measured the light theme on the review and progress pages: step tones `text-warning` 2.13:1, `text-info` 3.63:1,
`text-success` 3.64:1, the failure heading 4.24:1 and muted text on the tinted card 4.44:1. The status tokens are tuned
for dark mode and tinted surfaces and are shared by the whole app, so they were **not** changed. Threads now pair a
dark shade for light mode with the bright token for dark mode (`THREAD_STEP_OUTCOME_TONES`: blue-700 6.7:1, green-700
5.0:1, amber-700 5.0:1, red-800 on the tint 7.0:1) and uses foreground text instead of muted text inside the failure
card. `constants/__tests__/thread-step-outcome-tones.test.ts` fails if a bare status token comes back.

The draft preview used a scrollable `<pre>` that a keyboard could not reach (axe `scrollable-region-focusable`); it is
now a read-only `Textarea`. Step excerpts (at most 1,200 characters) no longer scroll.

## 5. Honest progress copy

- A job with status `QUEUED` has not started. The headline is `chat.threadProgress.statusQueued` ("Waiting in the
  queue"), with `queuedHint` underneath, and the "Attempt 0 of 3" and "Still working" lines are hidden. Stage wording
  ("Freezing your chat") only applies once the job runs. Cancel is still offered. The same headline logic
  (`threadHeadlineKey(status, stage)`) feeds the owner detail page.
- "Spent so far" shows only when `hasThreadSpend(spentMicroCredits)` (a finite number above zero). A default `$0.00` is
  not a measurement, so the line stays hidden until a real value exists.

## 6. Viewer reaction after a reload

`GET /thread-publications/public/:slug/reactions` is public and always answers `viewerReaction: null`, so a signed-in
reader's own like was highlighted only after clicking. **Backend part (not done here):** make that read optional-auth
(parse the Bearer token if present, never reject) and pass the user id to the summary query; the service and
repository already accept a viewer id.

Frontend stop-gap: `useThreadPublicMutation` remembers the reaction this browser sent in `localStorage`
(`claw.thread-reaction:<userId>:<slug>`, guarded for blocked storage) and `useThreadPublicPage` fills only the `null`
the service returns (`withRememberedReaction`). A real value from the service always wins; a signed-out reader or a
different account on the same browser sees nothing highlighted. A reaction changed on another device shows stale until
the backend part ships; clicking always sends the truth.

## Tests

`components/threads/__tests__/` (banner, export, report form, change-request labels, community, share, detail, progress
panel), `hooks/threads/__tests__/` (change-request form, public mutation, public page), `utilities/__tests__/`
(progress helpers, viewer reaction, report reason), `constants/__tests__/thread-step-outcome-tones.test.ts`,
`lib/i18n/__tests__/threads-translation-keys.test.ts`.
