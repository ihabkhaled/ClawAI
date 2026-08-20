# Mobile regression — 2026-08-20

## Scope and evidence rules

- Target: the running application at `https://claw.local` (live UI reports v1.27.1).
- Fix target: `agent/mobile-pwa-critical-fixes` at `2a98644b` (v1.27.2 source).
- Roles: administrator and normal user, using the credentials supplied for this audit.
- Primary viewport: 360 x 800. Breakpoint verification: 320 x 568, 390 x 844, 430 x 932, 768 x 1024, and 1280 x 800.
- Locales: English and a focused Arabic RTL pass.
- Coverage: public, authentication, portal, admin, chat-mode, routing, research, agent, workspace, observability, and real-ID detail routes.
- This ledger reports **2,604 measured undersized-control occurrences across 96 route/role observations**. These are affected instances, not 2,604 independent root causes. Overflow, clipping, font-size, RTL, and interaction defects are additional findings below.
- A control is undersized when its rendered width or height is below 44 CSS pixels. A form control is an iOS zoom risk when its computed font size is below 16px.
- Live findings must be checked against the newer branch before each patch; an item already fixed on the branch is verification work, not a second code change.

## Exclusions and invalid evidence

- `/billing/checkout`, payment-window, and payment-return were not opened because they can create checkout or payment state.
- `/en/billing/cancelled` redirects to `/en/billing`; it is not counted as a separate page.
- The Next.js development-tools overlay intercepted two mobile-nav clicks. This is development-only interference and is excluded from product defects.
- An early cross-width run did not apply its requested viewport and remained at 360px. All results from that run were discarded.
- An initial Arabic direct-navigation pass normalized back to English. It was discarded; only pages visited after selecting Arabic in the UI are included.
- Auth pages observed while already signed in redirected to Chat. Those observations were discarded and auth was rerun after a real sign-out.
- A four-route browser-adapter attempt collided with an existing profile. It yielded no valid page result and is excluded.

## Severity summary

| ID      | Severity | Root defect                                                                  | Verified impact                                                                                                                          |
| ------- | -------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| MOB-001 | Critical | Wide tables and cards escape or clip the mobile viewport                     | Core actions and data become inaccessible on Files, Billing, App Configs, Research, Routing, Connectors, Agent Activity, and Sync Health |
| MOB-002 | High     | Shared interactive controls render below the 44px touch target               | 2,604 occurrences across 96 observations                                                                                                 |
| MOB-003 | High     | Inputs and textareas use 13–15px text                                        | iOS focus zoom and reduced readability across auth, chat, filters, admin forms, routing, and workspace forms                             |
| MOB-004 | High     | Fixed bottom navigation competes with horizontal scrollbars and page content | Controls and content are obscured on dense pages at 320–430px                                                                            |
| MOB-005 | High     | Dense desktop tables have no mobile information architecture                 | Essential columns and row actions require horizontal dragging or are unreachable                                                         |
| MOB-006 | Medium   | Long unbroken values have no safe wrapping strategy                          | URLs, regexes, identifiers, and metadata expand cards/pages by 73–378px                                                                  |
| MOB-007 | Medium   | Mobile content collapses too narrowly around badges/actions                  | File metadata becomes one token per line; badges clip at 320px                                                                           |
| MOB-008 | Medium   | Tabs remain desktop-width or undersized                                      | Smart Router tabs clip; Chat tabs are about 27px high                                                                                    |
| MOB-009 | Medium   | Public/auth controls consistently use 36–40px heights                        | Header, language/theme, form buttons, links, checkbox, and password reveal miss touch guidance                                           |
| MOB-010 | Medium   | Arabic accessible labels are not fully localized                             | Theme control remains English; Expand labels also remain English in Arabic UI                                                            |
| MOB-011 | Medium   | Some row actions are positioned outside the viewport                         | Admin Users temporary-password actions begin at x=-86                                                                                    |
| MOB-012 | Medium   | Responsive behavior depends on data length and state                         | Logs overflow changed with loaded data; long Research source URLs cause severe expansion                                                 |

## Route occurrence ledger

The `Small` column is the measured count of visible interactive elements below 44px at 360 x 800 unless a role is stated. `Zoom` records confirmed form controls below 16px where specifically measured.

### Admin

| Route                               | Small | Zoom / layout finding                                                                   |
| ----------------------------------- | ----: | --------------------------------------------------------------------------------------- |
| `/en/admin`                         |    18 | Shared admin chrome                                                                     |
| `/en/admin/ai-action-policies`      |    61 | Main +187px; regex/provider/action content reaches x=532; priority/action controls clip |
| `/en/admin/billing`                 |    15 | Shared chrome                                                                           |
| `/en/admin/deployment`              |    16 | Shared chrome plus local action                                                         |
| `/en/admin/payment-gateways`        |    33 | At least 8 fields at 13px                                                               |
| `/en/admin/plans`                   |    62 | Dense row actions and compact controls                                                  |
| `/en/admin/plans/new`               |    45 | At least 8 inputs/textareas at 13px                                                     |
| `/en/admin/refunds`                 |    26 | Compact filters/actions                                                                 |
| `/en/admin/roles`                   |    20 | Compact actions                                                                         |
| `/en/admin/runtime-progress`        |    15 | Shared chrome                                                                           |
| `/en/admin/smart-router`            |    22 | Main +176px; Revision Detail, Publish, and Compare tabs clip                            |
| `/en/admin/suggestion-rules`        |    34 | Compact filters/actions                                                                 |
| `/en/admin/users`                   |    54 | Eight temporary-password buttons start at x=-86; search is 13px                         |
| `/en/admin/webhook-deliveries`      |    68 | Two 13px filter inputs                                                                  |
| `/en/admin/plans/{id}/edit`         |    45 | 11 zoom-risk fields                                                                     |
| `/en/admin/plans/{id}/model-access` |    15 | Shared chrome                                                                           |
| `/en/admin/plans/{id}/prices`       |    19 | One zoom-risk field                                                                     |
| `/en/admin/roles/{id}`              |    71 | Dense permission controls                                                               |

### Core portal and models

| Route / role                | Small | Zoom / layout finding                                    |
| --------------------------- | ----: | -------------------------------------------------------- |
| `/en/dashboard` admin       |    15 | Shared chrome                                            |
| `/en/dashboard` user        |    10 | Shared chrome                                            |
| `/en/chat` admin            |    49 | Search 13px                                              |
| `/en/chat` user             |    14 | Search 13px; tabs about 27px high                        |
| `/en/connectors`            |    28 | Compact cards/actions                                    |
| `/en/connectors/{id}`       |    20 | Main +223px; 26 elements outside viewport                |
| `/en/files`                 |    55 | Document +63px; main +94px; View chunks/Delete offscreen |
| `/en/models`                |    15 | Shared chrome                                            |
| `/en/models/catalog`        |    15 | Shared chrome                                            |
| `/en/models/local`          |    15 | Shared chrome                                            |
| `/en/models/local-frontier` |    15 | Shared chrome                                            |
| `/en/routing`               |    22 | Two 13px inputs                                          |
| `/en/context`               |    17 | Compact actions                                          |
| `/en/billing` admin         |    38 | Invoice table +216px                                     |
| `/en/usage` admin           |    16 | Compact controls                                         |
| `/en/usage` user            |    11 | Element begins at x=-177                                 |
| `/en/plan`                  |    15 | Shared chrome                                            |
| `/en/settings` admin        |    30 | At least 8 fields at 13px                                |
| `/en/settings` user         |    25 | At least 8 fields at 13px                                |
| `/en/settings/devices`      |    97 | Dense device actions                                     |
| `/en/settings/devices/{id}` |    16 | Compact actions                                          |
| `/en/audits`                |    20 | One zoom-risk field                                      |

### Chat modes

Every mode below uses a 13px composer textarea and therefore risks iOS focus zoom.

| Route                    | Small |
| ------------------------ | ----: |
| `/en/chat/best-of-n`     |    17 |
| `/en/chat/compare`       |    18 |
| `/en/chat/consensus`     |    19 |
| `/en/chat/cost-ensemble` |    21 |
| `/en/chat/decompose`     |    17 |
| `/en/chat/escalation`    |    19 |
| `/en/chat/pipeline`      |    18 |
| `/en/chat/repair`        |    17 |
| `/en/chat/role-pack`     |    17 |
| `/en/chat/verify`        |    20 |
| `/en/chat/{threadId}`    |    28 |

The real thread also contains two zoom-risk inputs.

### Routing and research

| Route                           | Small | Zoom / layout finding                                                      |
| ------------------------------- | ----: | -------------------------------------------------------------------------- |
| `/en/routing/adaptive-insights` |    16 | Table reaches x=606; Avg Confidence and Top Modes hidden                   |
| `/en/routing/models`            |    19 | Table reaches x=727; Quality, Cost, Latency, Privacy hidden; search 13px   |
| `/en/routing/playground`        |    19 | Textarea 13px                                                              |
| `/en/routing/recovery`          |    15 | Table reaches x=623; fallback/model/mode/time hidden                       |
| `/en/routing/replay`            |    25 | Three 13px filters                                                         |
| `/en/research/providers`        |    20 | Main +304px; table reaches x=664; Base URL, Status, Secret, Actions hidden |
| `/en/research/runs`             |   157 | Main +378px; long source URLs drive expansion                              |

### Agent

| Route / role                | Small | Layout finding                                              |
| --------------------------- | ----: | ----------------------------------------------------------- |
| `/en/agent` admin           |    15 | Shared chrome                                               |
| `/en/agent` user            |    10 | Shared chrome                                               |
| `/en/agent/activity`        |    45 | Rows reach x=698; internal clipping masks document overflow |
| `/en/agent/capabilities`    |    15 | Cards/status/code reach x=404                               |
| `/en/agent/marketplace`     |    16 | Compact controls                                            |
| `/en/agent/activity-memory` |    15 | Shared chrome                                               |
| `/en/agent/connect`         |    15 | Shared chrome                                               |
| `/en/agent/recipes`         |    15 | Shared chrome                                               |
| `/en/agent/repos`           |    15 | Shared chrome                                               |
| `/en/agent/terminal`        |    15 | Shared chrome                                               |

### Workspace

| Route / role                           | Small | Zoom / layout finding                                                        |
| -------------------------------------- | ----: | ---------------------------------------------------------------------------- |
| `/en/workspace` admin                  |    61 | Connector cards reach x=418; main +73px                                      |
| `/en/workspace` user                   |    12 | Empty-state compact controls                                                 |
| `/en/workspace/actions`                |    15 | Shared chrome                                                                |
| `/en/workspace/approvals`              |    15 | Shared chrome                                                                |
| `/en/workspace/app-configs`            |    56 | Table reaches x=938; main +593px; Auth, Status, Secret, Actions inaccessible |
| `/en/workspace/automation-preferences` |    55 | At least 8 fields at 13–15px                                                 |
| `/en/workspace/digest`                 |    17 | Compact actions                                                              |
| `/en/workspace/docs`                   |    15 | Shared chrome                                                                |
| `/en/workspace/email-signatures`       |    16 | Compact actions                                                              |
| `/en/workspace/email-templates`        |    16 | Compact actions                                                              |
| `/en/workspace/inbox`                  |   118 | Dense message controls                                                       |
| `/en/workspace/search`                 |    16 | Search 13px                                                                  |
| `/en/workspace/semantic-search`        |    18 | Query input 13px                                                             |
| `/en/workspace/source-control`         |    15 | Shared chrome                                                                |
| `/en/workspace/sync-health`            |    15 | Table reaches x=687; Cadence, Success rate, Avg duration, Status hidden      |
| `/en/workspace/workflows`              |    35 | Dense workflow controls                                                      |
| `/en/workspace/confluence`             |    15 | Shared chrome                                                                |
| `/en/workspace/figma`                  |    15 | Shared chrome                                                                |
| `/en/workspace/gmail`                  |    15 | Shared chrome                                                                |
| `/en/workspace/jira`                   |    15 | Shared chrome                                                                |
| `/en/workspace/impl-handoffs`          |    15 | Shared chrome                                                                |
| `/en/workspace/slack`                  |    15 | Shared chrome                                                                |
| `/en/workspace/providers`              |    27 | Compact controls                                                             |

### Observability

| Route               | Small | Zoom / layout finding                                            |
| ------------------- | ----: | ---------------------------------------------------------------- |
| `/en/logs`          |    38 | Eight 13px filters; data-dependent overflow up to +63px observed |
| `/en/memory`        |    64 | Search 13px                                                      |
| `/en/observability` |    15 | Shared chrome                                                    |

### Public and authentication

Public pages did not horizontally overflow, but every page inherits undersized header/footer targets. Counts were 25–31 per page on `/en`, `/about`, `/features`, `/how-it-works`, `/pricing`, `/faq`, `/contact`, `/use-cases`, `/security-and-privacy`, `/local-first-ai`, `/architecture`, `/supported-models`, `/privacy`, `/terms`, `/cookies`, and `/acceptable-use`. These shared public-page counts are documented separately and are not included in the 2,604 portal total above.

| Route                              |              Small | Zoom / sizing finding                                                                     |
| ---------------------------------- | -----------------: | ----------------------------------------------------------------------------------------- |
| `/en/login`                        |                 11 | Email, password, checkbox text 13px; inputs/buttons 40px; reveal 28px wide; checkbox 16px |
| `/en/register`                     |                 12 | Six 13px fields; inputs/buttons 40px                                                      |
| `/en/forgot-password`              |                  6 | Input 13px; button 40px                                                                   |
| `/en/reset-password` invalid token |                  4 | 36px chrome; 40px link                                                                    |
| `/en/contact`                      | 25–31 shared range | Three inputs and textarea 13px/40px; submit 40px                                          |
| `/en/pricing`                      | 25–31 shared range | Monthly/Yearly controls 36px high                                                         |

Shared public failures: menu 36 x 36, brand link 32px high, and footer links commonly 16px high.

## Verified breakpoint behavior

| Surface        | 320px                  | 390px                    | 430px                    | 768px                    | 1280px                   |
| -------------- | ---------------------- | ------------------------ | ------------------------ | ------------------------ | ------------------------ |
| Smart Router   | main +231, 4 outside   | +146, 3 outside          | +106                     | +36, 2 outside           | clears                   |
| Files          | main +134, 88 outside  | +64, 48 outside          | +24, 8 outside           | clears                   | clears                   |
| App Configs    | main +633, 279 outside | +563, 258 outside        | +523                     | +453, 237 outside        | clears                   |
| Research Runs  | main +418, 543 outside | +348, 225 outside        | +308, 62 outside         | +238, 10 outside         | clears                   |
| Agent Activity | 210 outside            | 208 outside              | 202 outside              | 187 outside              | clears                   |
| Billing        | main +256, 118 outside | +186, 105 outside        | +146, 89 outside         | +76, 53 outside          | clears                   |
| Logs           | main +6; 8 zoom-risk   | no overflow; 8 zoom-risk | no overflow; 8 zoom-risk | no overflow; 8 zoom-risk | no overflow; 8 zoom-risk |
| Sync Health    | invalid run, excluded  | 83 outside               | 67 outside               | 51 outside               | clears                   |

The 768px results prove several surfaces remain broken on tablets, not only narrow phones. Persistent sub-44px controls at 1280px also show that touch-target defects are component sizing problems rather than responsive-only failures.

## Visual inspection notes at 320 x 568

1. App Configs shows a persistent horizontal scrollbar directly above the fixed bottom navigation. Only Name, Provider, and a clipped `Aut…` header fit. Row actions require horizontal dragging.
2. Research Runs clips its completion badge, renders evidence cards wider than the viewport, and places the horizontal scrollbar at the content/bottom-nav boundary. The `More` label is crowded at the edge.
3. Files collapses metadata to roughly one token per line, clips status/expiry badges, shows two horizontal scrollbars, and allows the card to extend beneath the bottom navigation.
4. The five-item bottom navigation is crowded at 320px even on pages without overflow.
5. The top app bar is cramped because several 32–40px controls compete for the same narrow row.

## RTL findings

- Valid pages audited after selecting Arabic in the UI: `/ar/dashboard`, `/ar/chat`, `/ar/settings`, and `/ar/workspace`.
- Chat's floating action button mirrors to the left correctly.
- No new Arabic-only horizontal overflow was found on those four pages.
- The Arabic theme button retains the English accessible label `Current theme: system. Click to change.`
- Sidebar `Expand` accessible labels also remain English.
- Arabic Chat inherits the 13px search field and approximately 27px tabs.
- Arabic app chrome inherits 32px expansion controls, 36px search/language/theme controls, and 40px avatar/sidebar controls.

## Source ownership map for remediation

| Defect family                | Primary source candidates                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Touch target primitives      | `components/ui/button-variants.ts`, `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/textarea.tsx`, `components/ui/tabs.tsx` |
| Portal chrome and navigation | `components/layout/sidebar.tsx`, `sidebar-nav-item.tsx`, `mobile-bottom-nav.tsx`, `mobile-bottom-nav-item.tsx`, `global-search.tsx`               |
| Table containment            | `components/ui/table.tsx` plus each affected page's table/card composition                                                                        |
| Admin overflow               | admin Users, Smart Router, AI Action Policies, Plans, Roles, Webhook Deliveries, and Payment Gateways pages                                       |
| Core overflow                | Files, Billing, Connectors detail, Usage, and Settings device pages                                                                               |
| Routing/research overflow    | Adaptive Insights, Models, Recovery, Replay, Research Providers, and Research Runs pages                                                          |
| Workspace overflow           | Workspace landing, App Configs, Automation Preferences, Inbox, and Sync Health pages                                                              |
| Agent overflow               | Activity and Capabilities components/pages                                                                                                        |
| Auth/public sizing           | auth form components and marketing header/footer/form controls                                                                                    |
| RTL labels                   | layout locale dictionaries and accessible-name call sites                                                                                         |

## Fix order and regression constraints

1. Add failing tests for shared target size, 16px mobile form text, overflow containment, bottom-nav clearance, and localized accessible labels.
2. Fix shared UI primitives and portal chrome first; rerun affected route measurements to remove duplicate symptoms.
3. Convert dense mobile tables to deliberate card/priority-column layouts or contained scroll regions with visible affordances. Preserve full desktop tables at desktop breakpoints.
4. Add safe wrapping/truncation for URLs, regexes, IDs, metadata, and code without destroying copy access.
5. Fix page-specific overflow in the severity order above.
6. Regress admin and normal-user roles at all five widths, then English and Arabic.
7. Verify desktop at 1280px after every coherent batch.
8. Run the frontend test, typecheck, lint, and build lanes; regenerate repository knowledge and inventory artifacts after formatting; commit and push without bypassing hooks.

## Acceptance criteria

- No document or main-content horizontal overflow at 320, 360, 390, 430, 768, or 1280px, except an intentionally contained data scroller whose controls remain reachable and which does not collide with fixed navigation.
- No visible interactive target below 44 x 44px in mobile layouts unless an explicit documented accessibility exception applies.
- No mobile input, textarea, or select below 16px computed font size.
- No fixed navigation overlap with content, focus rings, dialogs, scrollbars, or safe-area insets.
- Essential table data and every row action are available without dragging the entire page.
- Long user/data values wrap or truncate safely without widening their container.
- Arabic layout mirrors correctly and all accessible labels are localized.
- Desktop layout and behavior remain unchanged or improve, with all repository gates green.
