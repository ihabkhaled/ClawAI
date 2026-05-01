# UI and Browser Testing Standard

> How to test every frontend page and component in ClawAI.
> Every user-visible feature must be tested in the browser with DevTools open.

---

## Testing Environment Setup

### Browser Configuration

1. Use Chrome or Chromium (primary target).
2. Open DevTools before starting any test (F12 or Ctrl+Shift+I).
3. Enable the following DevTools panels:
   - **Console** -- check for errors and warnings.
   - **Network** -- inspect all API requests and responses.
   - **Application > Local Storage** -- check auth tokens and Zustand state.
4. Install React DevTools extension for component tree inspection.
5. Disable browser caching: DevTools > Network > "Disable cache" checkbox.

### Test Accounts

Prepare test accounts for each role:

| Role     | Email            | Purpose                               |
| -------- | ---------------- | ------------------------------------- |
| ADMIN    | admin@claw.ai    | Full access to all features           |
| OPERATOR | operator@claw.ai | Standard user operations              |
| VIEWER   | viewer@claw.ai   | Read-only access, verify restrictions |

### Docker Logs

Keep a terminal open with frontend container logs:

```bash
./scripts/claw.sh logs -f frontend
```

Watch for SSR errors, hydration mismatches, and build warnings.

---

## Section 1: Browser Testing Methodology

### 1.1 Systematic Page Walk-Through

For every page in the application, follow this sequence:

1. **Navigate to the page** using the sidebar or URL.
2. **Observe initial render** -- does the page load without a blank flash?
3. **Check loading state** -- is a skeleton or spinner shown while data loads?
4. **Check data state** -- does the page show correct data after loading?
5. **Check empty state** -- if no data exists, does the page show a helpful empty state with a call-to-action?
6. **Interact with every control** -- click every button, toggle, dropdown, input field.
7. **Check error state** -- disconnect network or stop a backend service, then reload.
8. **Check console** -- are there any errors or warnings?
9. **Check network** -- are requests going to the correct endpoints with correct payloads?

### 1.2 Pages to Test

| Page             | Path               | Key Controls                                                                                      |
| ---------------- | ------------------ | ------------------------------------------------------------------------------------------------- |
| Login            | `/login`           | Email input, password input, submit button, error messages                                        |
| Dashboard        | `/`                | Stats cards, recent activity, quick actions                                                       |
| Chat             | `/chat`            | Thread list, new thread button, thread selection                                                  |
| Chat Thread      | `/chat/[threadId]` | Message composer, model selector, file picker, send button, message bubbles, routing transparency |
| Chat Compare     | `/chat/compare`    | Multi-model comparison, parallel execution                                                        |
| Connectors       | `/connectors`      | Connector list, create button, status badges                                                      |
| Connector Detail | `/connectors/[id]` | Edit form, test button, sync button, model list                                                   |
| Models (Cloud)   | `/models`          | Model table, provider grouping                                                                    |
| Models (Local)   | `/models/local`    | Local model list, role assignments                                                                |
| Model Catalog    | `/models/catalog`  | Category tabs, download buttons, progress bars                                                    |
| Routing          | `/routing`         | Policy list, create button, decision log                                                          |
| Routing Replay   | `/routing/replay`  | Replay button, comparison table, summary card                                                     |
| Memory           | `/memory`          | Memory list, type filter, enable/disable toggle                                                   |
| Context Packs    | `/context`         | Pack list, create button, item management                                                         |
| Files            | `/files`           | File list, upload button, ingestion status                                                        |
| Observability    | `/observability`   | Health dashboard, service status                                                                  |
| Audits           | `/audits`          | Audit log table, filters, pagination                                                              |
| Logs             | `/logs`            | Log viewer, level filter, search                                                                  |
| Admin            | `/admin`           | User management, system settings                                                                  |
| Settings         | `/settings`        | User preferences, theme, language                                                                 |

### 1.3 What to Check on Every Page

- [ ] Page loads without blank screen or crash
- [ ] Loading skeleton shown while data is fetching
- [ ] Data renders correctly after loading
- [ ] Empty state shown when no data exists
- [ ] Error state shown when API fails
- [ ] No console errors in DevTools
- [ ] No network errors (red entries in Network tab)
- [ ] Page title and breadcrumbs are correct
- [ ] Sidebar highlights the correct navigation item

---

## Section 2: State Coverage

Every data-driven component must handle these states:

### 2.1 Loading State

- [ ] Skeleton or spinner is visible while data loads
- [ ] The skeleton matches the layout of the final content (same card shapes, same row heights)
- [ ] No flash of empty state before data arrives
- [ ] No "undefined" or "null" text visible during loading

### 2.2 Empty State

- [ ] A clear message explains there is no data (not just a blank area)
- [ ] A call-to-action button guides the user to create their first item
- [ ] The empty state is visually distinct from the loading state
- [ ] Example: "No chat threads yet. Start a new conversation." with a "New Thread" button

### 2.3 Error State

- [ ] Error message is user-friendly (not a raw stack trace or JSON blob)
- [ ] Error message is translated (using `t()`)
- [ ] A retry button is available where appropriate
- [ ] The error state does not break the page layout
- [ ] The user can navigate away from the error state using the sidebar

### 2.4 Success State

- [ ] Data renders correctly with proper formatting
- [ ] Dates are formatted according to locale
- [ ] Numbers are formatted (e.g., file sizes as "1.2 GB", not "1234567890")
- [ ] Lists are paginated (not rendering 10,000 items at once)
- [ ] Sorting works (click column headers, verify order)

### 2.5 Partial Data

- [ ] Components handle missing optional fields gracefully
- [ ] A thread with no system prompt does not show "null" or "undefined"
- [ ] A connector with no models shows an appropriate message
- [ ] A message with no feedback shows no feedback indicator (not a broken icon)

---

## Section 3: Console Inspection

### 3.1 What to Look For

Open DevTools Console and check for:

| Type                                                         | Severity      | Action                                                      |
| ------------------------------------------------------------ | ------------- | ----------------------------------------------------------- |
| Red errors (`Error`, `TypeError`, `ReferenceError`)          | Blocker       | Fix immediately. These indicate broken functionality.       |
| React warnings (key prop, effect dependency, deprecated API) | Major         | Fix before release. These cause bugs or performance issues. |
| Hydration mismatch warnings                                  | Major         | Fix immediately. SSR/client mismatch causes UI flicker.     |
| Network errors (CORS, 401, 500)                              | Major         | Investigate the failing endpoint.                           |
| `console.log` statements                                     | Minor         | Remove. Should only be `console.warn` or `console.error`.   |
| Deprecation warnings from libraries                          | Informational | Track for future updates.                                   |

### 3.2 Clean Console Goal

The console should show ZERO errors and ZERO warnings on a fully working page. Any output is a signal that something needs attention.

### 3.3 Common Console Issues in ClawAI

| Issue                                           | Cause                                    | Fix                                                                                |
| ----------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| "Cannot read property of undefined"             | Component rendering before data loads    | Add loading state check before accessing data properties                           |
| "Each child in a list should have a unique key" | Missing `key` prop in `.map()`           | Add `key={item.id}` to list items                                                  |
| "Hydration mismatch"                            | Server-rendered HTML differs from client | Ensure consistent rendering (no `Date.now()`, `Math.random()`, or `window` in SSR) |
| CORS error                                      | Frontend calling backend on wrong port   | Use Nginx proxy (port 4000), not direct service port                               |
| 401 Unauthorized                                | Token expired or missing                 | Check token refresh flow in `http-client.ts`                                       |

---

## Section 4: Docker Log Inspection

### 4.1 Frontend Container Logs

```bash
./scripts/claw.sh logs -f frontend --since 5m
```

Watch for:

- SSR compilation errors
- Module not found errors
- Build warnings
- Runtime errors during page rendering

### 4.2 Backend Service Logs

```bash
# All services
./scripts/claw.sh logs --since 5m 2>&1 | grep -i error

# Specific service
./scripts/claw.sh logs chat-service --since 5m
```

After every browser action that triggers an API call, check the corresponding service log for errors.

---

## Section 5: Network Inspection

### 5.1 Request Verification

For every user action that triggers an API call:

1. Open DevTools Network tab.
2. Perform the action.
3. Find the request in the list.
4. Verify:
   - [ ] Correct URL (matches the expected endpoint)
   - [ ] Correct HTTP method (GET, POST, PATCH, DELETE)
   - [ ] Correct headers (`Authorization: Bearer ...`, `Content-Type: application/json`)
   - [ ] Correct request body (matches what the user entered)
   - [ ] Request goes through Nginx (port 4000), not directly to service

### 5.2 Response Verification

For the same request:

- [ ] Correct status code (200, 201, 400, 404, etc.)
- [ ] Response body contains expected data
- [ ] Response time is reasonable (under 2 seconds for standard CRUD, under 30 seconds for AI generation)
- [ ] No duplicate requests (verify the request fires once, not multiple times)

### 5.3 Common Network Issues

| Issue               | Symptom                       | Investigation                                                                                      |
| ------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------- |
| Double request      | Same endpoint called twice    | Check for duplicate `useQuery` calls, strict mode double-render, missing dependency in `useEffect` |
| Missing auth header | 401 on authenticated endpoint | Check `http-client.ts` interceptor, verify token in Local Storage                                  |
| Wrong URL           | 404                           | Check repository method, verify Nginx route mapping                                                |
| Large payload       | Slow response, timeout        | Check if response includes unnecessary nested data, verify pagination                              |
| CORS error          | Blocked by CORS policy        | Check `CORS_ORIGINS` env var, verify Nginx proxy headers                                           |

---

## Section 6: Refresh Behavior

### 6.1 Data Persistence Across Refresh

After every data-modifying action:

1. Perform the action (create thread, send message, update settings).
2. Verify the UI shows the change.
3. Press F5 (full page refresh).
4. Verify the data is still present and correct.
5. Verify the user is still authenticated (not logged out).

### 6.2 What Must Survive Refresh

- [ ] Authentication state (user stays logged in)
- [ ] Current page and route
- [ ] Created/updated data (threads, messages, connectors, etc.)
- [ ] User preferences (theme, language, sidebar state)

### 6.3 What May Reset on Refresh

- Active download progress (SSE reconnection needed)
- Unsaved form inputs
- Transient toast notifications
- Expanded/collapsed panel states (unless persisted in Zustand)

---

## Section 7: Navigation Testing

### 7.1 Back/Forward Buttons

1. Navigate: Dashboard > Chat > Thread A > Thread B.
2. Press browser Back button.
3. Verify: you return to Thread A (not Dashboard, not blank page).
4. Press Back again.
5. Verify: you return to Chat thread list.
6. Press Forward.
7. Verify: you return to Thread A.

### 7.2 Direct URL Access

1. Copy the URL of a specific page (e.g., `/chat/some-thread-id`).
2. Open a new browser tab.
3. Paste the URL and navigate.
4. Verify: the page loads correctly with the correct data (not a 404 or blank page).
5. If not authenticated: verify redirect to login page, then redirect back after login.

### 7.3 Invalid URLs

1. Navigate to `/chat/nonexistent-thread-id`.
2. Verify: 404 page or "Thread not found" error state (not a crash).
3. Navigate to `/nonexistent-page`.
4. Verify: 404 page with navigation back to dashboard.

---

## Section 8: Dark Mode Testing

### 8.1 Visual Verification

1. Toggle dark mode (Settings > Theme or system preference).
2. Visit every page listed in Section 1.2.
3. For each page, verify:
   - [ ] All text is readable (sufficient contrast against background)
   - [ ] No hard-coded colors that break in dark mode (e.g., `text-black` instead of `text-foreground`)
   - [ ] Borders and dividers are visible (not same color as background)
   - [ ] Form inputs have visible borders and placeholder text
   - [ ] Dropdowns and popovers have correct background colors
   - [ ] Code blocks and pre-formatted text are styled for dark mode
   - [ ] Charts and graphs use theme-aware colors
   - [ ] Toast notifications are readable
   - [ ] Modal/dialog overlays have appropriate contrast

### 8.2 Implementation Check

- [ ] All colors use CSS variables (`var(--background)`, `var(--foreground)`, `var(--primary)`, etc.)
- [ ] No `dark:` Tailwind prefixes (CSS variables handle dark mode automatically)
- [ ] No raw color classes (`text-blue-500`) for semantic meaning
- [ ] Icons use `text-muted-foreground` or similar semantic class

---

## Section 9: Mobile Responsive Testing

### 9.1 Breakpoint Testing

Use DevTools responsive mode (Ctrl+Shift+M) to test at these widths:

| Width  | Breakpoint | Device Category                 |
| ------ | ---------- | ------------------------------- |
| 375px  | (below sm) | Mobile phone                    |
| 640px  | sm         | Large phone / small tablet      |
| 768px  | md         | Tablet portrait                 |
| 1024px | lg         | Tablet landscape / small laptop |
| 1280px | xl         | Desktop                         |
| 1536px | 2xl        | Large desktop                   |

### 9.2 What to Verify at Each Breakpoint

- [ ] Sidebar collapses to hamburger menu on mobile (below md)
- [ ] Content does not overflow horizontally (no horizontal scrollbar)
- [ ] Tables become scrollable or stack vertically on narrow screens
- [ ] Forms are usable (inputs not truncated, labels visible)
- [ ] Buttons are tap-friendly (minimum 44x44px touch target)
- [ ] Text is readable without zooming
- [ ] Modals and dialogs fit within the viewport
- [ ] Chat message bubbles do not extend beyond screen width
- [ ] Model selector dropdown is usable on narrow screens

### 9.3 Orientation Testing

For tablet breakpoints (768px-1024px):

- [ ] Portrait orientation works
- [ ] Landscape orientation works
- [ ] Rotation does not break layout or lose state

---

## Section 10: RTL (Arabic) Testing

### 10.1 Enable Arabic

1. Go to Settings > Language > Arabic.
2. Verify the entire UI flips to right-to-left layout.

### 10.2 Layout Verification

- [ ] Sidebar appears on the RIGHT side of the screen
- [ ] Text is right-aligned by default
- [ ] Icons that indicate direction (arrows, chevrons) are mirrored
- [ ] Form labels are right-aligned
- [ ] Input fields have right-aligned placeholder text
- [ ] Breadcrumbs read right-to-left
- [ ] Tables have right-aligned headers and cells
- [ ] Pagination controls are mirrored (next/previous swap sides)

### 10.3 Text Overflow

- [ ] Arabic translations do not overflow their containers (Arabic text can be 30% longer than English)
- [ ] Long Arabic labels do not overlap adjacent elements
- [ ] Buttons with Arabic text do not clip or truncate
- [ ] Tooltips with Arabic text render correctly

### 10.4 Mixed Content

- [ ] English text within Arabic context renders correctly (e.g., model names, URLs)
- [ ] Code blocks remain left-to-right even in RTL layout
- [ ] Numbers display correctly (Arabic or Western digits, depending on locale setting)

---

## Section 11: Fake UI Detection

"Fake UI" means a UI element that looks interactive but does nothing.

### 11.1 Button Verification

For every button on the page:

1. Click the button.
2. Verify something happens:
   - An API call is made (check Network tab).
   - A modal or dialog opens.
   - A navigation occurs.
   - A toast notification appears.
   - A state change is visible.
3. If nothing happens, it is a fake UI bug.

### 11.2 Form Verification

For every form:

1. Fill out all fields.
2. Click submit.
3. Verify:
   - [ ] An API call is made with the form data.
   - [ ] Success feedback is shown (toast, redirect, inline message).
   - [ ] Error feedback is shown for invalid input.
   - [ ] The submit button shows a loading state during submission.
   - [ ] The submit button is disabled during submission (prevent double-submit).

### 11.3 Status Indicators

For every status badge, progress bar, or indicator:

1. Verify it reflects the actual state (not always showing "Active" or "100%").
2. Change the underlying state and verify the indicator updates.
3. Refresh the page and verify the indicator shows the persisted state.

### 11.4 Toast/Notification Verification

After every action that shows a toast:

- [ ] Toast message is accurate (not always "Success" regardless of outcome)
- [ ] Toast message is translated (uses `t()`)
- [ ] Error toasts show the actual error (not a generic message)
- [ ] Toast disappears after a reasonable timeout (3-5 seconds)
- [ ] Toast does not block interaction with the page

---

## Section 12: Stale State Detection

### 12.1 Edit-Save-Read Cycle

For every editable entity:

1. Read the current value.
2. Edit the value.
3. Save.
4. Verify the UI shows the NEW value (not the old one).
5. Navigate away.
6. Navigate back.
7. Verify the UI still shows the NEW value.

### 12.2 Cache Invalidation

After a mutation (create, update, delete):

- [ ] The list view updates to reflect the change (TanStack Query invalidation working)
- [ ] The detail view shows the new data (not stale cached data)
- [ ] Related views update (e.g., after deleting a thread, the sidebar list removes it)

### 12.3 Common Stale State Issues

| Issue                             | Cause                                                   | Detection                                          |
| --------------------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| List does not update after create | Missing query invalidation in `useMutation` `onSuccess` | Create item, check if list updates without refresh |
| Detail view shows old data        | Query cache not invalidated                             | Edit item, navigate away and back, check values    |
| Deleted item still visible        | Missing query invalidation or optimistic update         | Delete item, check if it disappears from list      |
| Counter shows wrong number        | Derived state not recalculated                          | Change data, check if counters/badges update       |

---

## Section 13: Multi-Tab Testing

### 13.1 Session Consistency

1. Open the app in Tab A and Tab B (both authenticated).
2. Log out in Tab A.
3. In Tab B, perform an action that requires authentication.
4. Verify: Tab B redirects to login (not a silent failure or crash).

### 13.2 Data Consistency

1. Open the same thread in Tab A and Tab B.
2. In Tab A, change the thread title and save.
3. In Tab B, refresh.
4. Verify: Tab B shows the new title.

### 13.3 Concurrent Editing

1. Open the same connector settings in Tab A and Tab B.
2. In Tab A, change the connector name to "Name A" and save.
3. In Tab B (still showing old name), change the status and save.
4. Verify: both changes are preserved, OR the later save overwrites with a clear indication.
5. Verify: no 500 errors, no data corruption, no silent data loss.

---

## Section 14: Tools Reference

### Browser DevTools

| Tool                        | Purpose                                | Key Shortcut      |
| --------------------------- | -------------------------------------- | ----------------- |
| Console                     | Check for errors, warnings, log output | Ctrl+Shift+J      |
| Network                     | Inspect API requests/responses         | Ctrl+Shift+E      |
| Elements                    | Inspect DOM structure and CSS          | Ctrl+Shift+C      |
| Application > Local Storage | Check auth tokens, Zustand state       | F12 > Application |
| Responsive Mode             | Test mobile breakpoints                | Ctrl+Shift+M      |
| Performance                 | Profile rendering performance          | Ctrl+Shift+E      |

### React DevTools

| Feature           | Purpose                                     |
| ----------------- | ------------------------------------------- |
| Components tab    | Inspect component tree, props, state, hooks |
| Profiler tab      | Identify unnecessary re-renders             |
| Highlight updates | Visual indicator of re-rendering components |

### Docker Commands

```bash
# Frontend logs
./scripts/claw.sh logs -f frontend

# All service logs
./scripts/claw.sh logs --since 5m

# Service health
curl http://localhost:4000/api/v1/health | jq .

# Restart frontend
./scripts/claw.sh restart frontend
```

### Database Verification

```bash
# Connect to a service's database
./scripts/claw.sh exec pg-chat psql -U claw -d claw_chat

# Quick queries
\dt                          -- List tables
SELECT count(*) FROM "ChatThread";
SELECT * FROM "ChatThread" ORDER BY "createdAt" DESC LIMIT 5;
```

---

## Testing Checklist Per Page

Use this checklist for every page you test:

```
Page: ____________________
Date: ____________________
Tester: __________________

Rendering:
  [ ] Page loads without crash
  [ ] Loading state shown
  [ ] Data renders correctly
  [ ] Empty state shown (when applicable)
  [ ] Error state shown (when API fails)

Console:
  [ ] Zero errors
  [ ] Zero warnings (or only known pre-existing)

Network:
  [ ] All requests use correct endpoints
  [ ] All requests include auth header
  [ ] All responses are 2xx (for valid requests)
  [ ] No duplicate requests

Interactions:
  [ ] Every button performs an action
  [ ] Every form submits correctly
  [ ] Every link navigates correctly
  [ ] Loading indicators shown during async operations

State:
  [ ] Data survives page refresh
  [ ] Edits persist after save
  [ ] Cache invalidation works (list updates after mutation)

Visual:
  [ ] Dark mode renders correctly
  [ ] Mobile layout works (375px, 768px)
  [ ] RTL layout correct (Arabic locale)
  [ ] No text overflow or truncation issues

Navigation:
  [ ] Back/forward buttons work
  [ ] Direct URL access works
  [ ] Invalid URLs show 404

Notes:
  ________________________________
  ________________________________
```
