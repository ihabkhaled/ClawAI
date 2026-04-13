# Client Acceptance Testing Standard

## Purpose

This document defines the standard for evaluating ClawAI features from the perspective of a real, non-technical client. The goal is to catch every issue that would erode trust, cause confusion, or make the product feel unfinished -- before a client ever sees it.

Every feature, page, and interaction must pass client acceptance testing before it is considered complete. This is not a developer test. This is a simulation of a paying client sitting down, using the product for the first time, and deciding whether they trust it.

---

## Client Persona

When performing client acceptance testing, adopt the following persona:

- **Not technical.** Does not know what an API is, what Docker is, or what a microservice is. Judges the product purely on what they see and experience.
- **Impatient.** Will not wait more than 2 seconds for something to happen. If a button does not respond immediately, they assume it is broken.
- **Quality-sensitive.** Notices visual inconsistencies, layout shifts, flickering, and misaligned elements. Has used polished products (Slack, Notion, Linear) and expects the same level of finish.
- **Risk-averse.** Any error message, blank screen, or unexpected behavior causes them to lose trust. One bad experience colors their perception of the entire product.
- **Goal-oriented.** Wants to accomplish a task (send a message, configure a connector, download a model) and does not care about the underlying technology.

---

## Client Questions

For every feature under test, answer each of these questions honestly. If the answer to any question is "no" or "maybe," the feature fails client acceptance.

### Trust and Confidence

| #   | Question                                | Pass Criteria                                                      |
| --- | --------------------------------------- | ------------------------------------------------------------------ |
| 1   | Would a client trust this feature?      | No error messages, no broken states, data is always correct        |
| 2   | Would a client be confused by any step? | Every action has a clear label, every flow has a logical sequence  |
| 3   | Would a client report this as buggy?    | No flickering, no stale data, no dead ends, no unexpected behavior |
| 4   | Does it feel production-grade?          | Comparable in polish to commercial SaaS products                   |

### Visual Quality

| #   | Question                                       | Pass Criteria                                                                 |
| --- | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| 5   | Is there any "jank"?                           | No flicker, no layout shift, no content jumping, no delayed renders           |
| 6   | Are transitions smooth?                        | Page transitions, modal opens/closes, sidebar toggles all animate smoothly    |
| 7   | Do buttons respond immediately?                | Click feedback within 100ms (hover state, disabled state, or loading spinner) |
| 8   | Are loading indicators present and reassuring? | Every async operation shows a spinner, skeleton, or progress bar              |

### Data Integrity

| #   | Question                                            | Pass Criteria                                                                             |
| --- | --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 9   | Is the data always fresh and correct after actions? | After create/update/delete, the UI reflects the change immediately without manual refresh |

---

## Client Acceptance Criteria

Every feature must satisfy all of the following criteria. These are non-negotiable.

### C1: No Visible Errors

- No error toasts, error banners, or error pages during normal operation.
- No red text or error indicators unless the user made an actual mistake (e.g., invalid form input).
- No console errors visible in browser DevTools (open DevTools Console tab and verify zero errors during the entire test flow).
- No network errors in the Network tab (no 4xx or 5xx responses during normal operation).

### C2: No Broken Layouts

Test every changed page at these viewport widths:

| Viewport | Width  | Represents                |
| -------- | ------ | ------------------------- |
| Mobile   | 375px  | iPhone SE / small Android |
| Tablet   | 768px  | iPad Mini                 |
| Laptop   | 1280px | 13" laptop                |
| Desktop  | 1920px | External monitor          |

At every viewport:

- No horizontal scrollbar on the page body.
- No text overflow or truncation that hides critical information.
- No overlapping elements.
- No elements pushed off-screen.
- Sidebar collapses correctly on mobile.
- Modals and dialogs are fully visible and scrollable.

### C3: No Stale Data After Mutations

After every create, update, or delete operation:

- The list/table view reflects the change immediately.
- The detail view shows updated values.
- Navigating away and back shows the correct state.
- No "flash of old data" before the new data appears.
- TanStack Query cache invalidation fires correctly (check Network tab for refetch).

Specific ClawAI scenarios to verify:

- After sending a chat message, the message appears in the thread immediately.
- After creating a connector, the connectors list shows the new entry.
- After pulling a model, the model catalog shows "Installed" status.
- After canceling a pull job, the download disappears from the active downloads panel.
- After changing thread settings (model, temperature), the next message uses the new settings.
- After deleting a memory, the memories list no longer shows it.
- After uploading a file, the files list shows it with correct metadata.

### C4: No Dead Controls

- Every button does something when clicked.
- Every link navigates somewhere.
- Every dropdown opens and its options are selectable.
- Every form submits when the submit button is clicked.
- Every delete button shows a confirmation dialog.
- Disabled buttons have a visible disabled state (opacity, cursor).
- No buttons that appear clickable but do nothing.

### C5: No Confusing Terminology

- All labels use plain language a non-technical person can understand.
- No developer jargon in user-facing text (no "mutation," "cache," "hydration," "SSE," "WebSocket").
- Error messages explain what went wrong and what the user can do about it.
- Empty states explain what the page is for and how to get started.
- Tooltips exist for any technical term that cannot be avoided (e.g., "Temperature" in thread settings).

### C6: Professional Appearance in Both Themes

Test in both light mode and dark mode:

- All text is readable (sufficient contrast ratio, WCAG AA minimum).
- No elements that are invisible or barely visible in one theme.
- Icons and badges are visible in both themes.
- Charts, graphs, and colored indicators work in both themes.
- Form inputs have visible borders and focus states in both themes.
- Selected/active states are clearly distinguishable in both themes.

### C7: Cross-Browser Consistency

Test the changed feature in all four browsers:

| Browser | Version               | Priority  |
| ------- | --------------------- | --------- |
| Chrome  | Latest stable         | Primary   |
| Firefox | Latest stable         | Primary   |
| Safari  | Latest stable (macOS) | Secondary |
| Edge    | Latest stable         | Secondary |

In each browser, verify:

- Layout matches Chrome (reference).
- Fonts render correctly.
- Animations and transitions work.
- Form inputs behave identically.
- File uploads work.
- SSE streaming works (chat messages, model downloads).
- Copy/paste works in text areas.

### C8: No Unexpected Navigation

- No redirects to login page during normal operation (unless the session truly expired).
- No blank screens during page transitions.
- No "404 Not Found" pages when following internal links.
- Browser back button works correctly and does not break state.
- Refreshing the page preserves the current view (no redirect to home).

---

## Scoring

Rate each criterion on a 1-5 scale:

| Score | Meaning                                                                    |
| ----- | -------------------------------------------------------------------------- |
| 5     | Exceptional. Polished, delightful, no issues.                              |
| 4     | Good. Minor imperfections that a client would not notice.                  |
| 3     | Acceptable. Noticeable issues but the feature works. A client might frown. |
| 2     | Poor. Obvious issues that a client would report as bugs.                   |
| 1     | Failing. Broken, unusable, or trust-destroying.                            |

### Scorecard Template

| Criterion                                 | Score (1-5) | Notes |
| ----------------------------------------- | ----------- | ----- |
| C1: No Visible Errors                     |             |       |
| C2: No Broken Layouts                     |             |       |
| C3: No Stale Data After Mutations         |             |       |
| C4: No Dead Controls                      |             |       |
| C5: No Confusing Terminology              |             |       |
| C6: Professional Appearance (Both Themes) |             |       |
| C7: Cross-Browser Consistency             |             |       |
| C8: No Unexpected Navigation              |             |       |
| **Average**                               |             |       |

### Pass/Fail Rules

- **Pass**: Average score >= 4.0 AND no individual criterion scored 1 or 2.
- **Conditional Pass**: Average score >= 3.5 AND no individual criterion scored 1. Issues documented and tracked.
- **Fail**: Any individual criterion scored 1 or 2, OR average score < 3.5.

A failed client acceptance test blocks release. The team must fix all issues, then re-run the full client acceptance test from scratch.

---

## Test Execution Process

### Step 1: Prepare

1. Open the application in Chrome at `http://localhost:3000`.
2. Open Chrome DevTools (F12). Switch to the Console tab. Clear the console.
3. Open a second browser (Firefox) for cross-browser checks.
4. Log in as each role (ADMIN, OPERATOR, VIEWER) to verify RBAC does not break the UI.
5. Have the scorecard template ready (copy from above).

### Step 2: Execute

For each feature under test:

1. **Happy path first.** Complete the primary user flow from start to finish.
2. **Empty states.** Navigate to the feature before any data exists. Verify the empty state is helpful.
3. **Error states.** Deliberately trigger errors (e.g., submit empty form, disconnect network). Verify error handling is graceful.
4. **Edge cases.** Test with long text, special characters, rapid clicks, and concurrent operations.
5. **Theme toggle.** Switch between light and dark mode mid-flow.
6. **Viewport resize.** Resize the browser window during the flow.
7. **Navigation stress.** Use browser back/forward buttons, refresh the page mid-flow.

### Step 3: Score and Document

1. Fill in the scorecard for each criterion.
2. For any score below 4, write a specific description of the issue.
3. Include screenshots for visual issues.
4. Include browser console output for any errors.
5. Submit the completed scorecard as part of the feature's acceptance evidence.

---

## ClawAI-Specific Test Scenarios

### Chat Flow

1. Create a new thread. Send a message. Verify the "AI is thinking..." indicator appears.
2. Verify the AI response appears smoothly (no flicker, no layout shift).
3. Verify routing transparency badge shows provider/model/confidence.
4. Send 10 rapid messages. Verify ordering is correct and no messages are lost.
5. Attach a file and send a message referencing it. Verify the attachment badge appears.
6. Switch routing mode in thread settings. Send another message. Verify the new mode is used.

### Model Catalog

1. Browse the catalog. Verify categories are clearly labeled.
2. Start a model download. Verify the progress bar updates smoothly.
3. Cancel a download mid-progress. Verify it stops and the UI resets.
4. Download completes. Verify the card updates to "Installed" without page refresh.

### Connectors

1. Create a new connector. Fill all fields. Submit. Verify it appears in the list.
2. Test the connector. Verify success/failure is clearly communicated.
3. Edit the connector. Change the API key. Save. Verify the update persists.
4. Delete the connector. Verify the confirmation dialog appears. Confirm. Verify removal.

### Observability

1. Navigate to audit logs. Verify entries exist for recent actions.
2. Navigate to server logs. Apply filters. Verify results update.
3. Navigate to health dashboard. Verify all services show status.

### Admin

1. As ADMIN, access user management. Create a new user. Verify RBAC assignment.
2. As OPERATOR, verify admin-only pages are not accessible (no link in sidebar, direct URL returns 403 or redirects).
3. As VIEWER, verify write operations are disabled (buttons disabled or hidden).
