# E2E Playwright Testing Standard

> ClawAI Quality Engineering -- Document 7 of 10

## Purpose

End-to-end tests validate complete user journeys through the ClawAI frontend, exercising the full stack from browser interaction through nginx, backend services, databases, and back. Playwright is the E2E framework for ClawAI.

---

## 1. Playwright Setup

### Configuration

**Config file:** `apps/claw-frontend/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: 1,
  fullyParallel: false, // Sequential -- services share state
  forbidOnly: !!process.env.CI,
  workers: 1, // Single worker -- shared auth state
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    process.env.CI ? ['github'] : ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
```

### Environment Requirements

- Full Docker Compose stack running (`./scripts/claw.sh up -d`)
- Frontend running on `http://localhost:3000` (either Docker or `npm run dev` in `apps/claw-frontend`)
- All 17 services healthy
- Seeded admin user: `admin@claw.ai` / `admin123` (or as configured in `.env`)
- At least one connector configured (Gemini recommended -- the only configured provider)
- At least one Ollama model pulled (gemma3:4b minimum)

### Test Data Setup

Create a `tests/e2e/fixtures/test-data.ts` with:

```typescript
export const TEST_USERS = {
  admin: { email: 'admin@claw.ai', password: 'admin123' },
  operator: { email: 'operator@claw.ai', password: 'operator123' },
  viewer: { email: 'viewer@claw.ai', password: 'viewer123' },
};

export const TEST_TIMEOUTS = {
  navigation: 5_000,
  llmResponse: 60_000,
  modelDownload: 300_000,
  sseEvent: 30_000,
};
```

---

## 2. Critical User Journeys

### Journey 1: Chat -- Send Message and Receive Response

**File:** `tests/e2e/chat/send-message.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Chat Message Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByTestId('email-input').fill('admin@claw.ai');
    await page.getByTestId('password-input').fill('admin123');
    await page.getByTestId('login-button').click();
    await page.waitForURL('**/dashboard');
  });

  test('send message and receive AI response with routing badge', async ({ page }) => {
    // Navigate to chat
    await page.getByTestId('sidebar-chat').click();
    await page.waitForURL('**/chat');

    // Create new thread
    await page.getByTestId('new-thread-button').click();

    // Type and send message
    await page.getByTestId('message-composer').fill('Write a Python hello world');
    await page.getByTestId('send-button').click();

    // Verify user message appears
    await expect(page.getByTestId('message-bubble-user').last()).toContainText(
      'Write a Python hello world',
    );

    // Wait for AI response (may take up to 60s depending on model)
    await expect(page.getByTestId('message-bubble-assistant').last()).toBeVisible({
      timeout: 60_000,
    });

    // Verify routing badge is present
    await expect(page.getByTestId('routing-badge').last()).toBeVisible();

    // Verify response contains code
    const response = await page.getByTestId('message-bubble-assistant').last().textContent();
    expect(response).toBeTruthy();
  });
});
```

**Assertions:**

- User message renders in the thread
- "AI is thinking" indicator appears during processing
- Assistant message appears with content
- Routing transparency badge shows provider/model
- Token count metadata is visible (if UI displays it)

### Journey 2: Connector Management

**File:** `tests/e2e/connectors/connector-crud.spec.ts`

```typescript
test('create connector, test connection, sync models', async ({ page }) => {
  await page.goto('/connectors');

  // Create connector
  await page.getByTestId('create-connector-button').click();
  await page.getByTestId('connector-name-input').fill('Test Gemini');
  await page.getByTestId('connector-provider-select').selectOption('GEMINI');
  await page.getByTestId('connector-apikey-input').fill(process.env.GEMINI_API_KEY!);
  await page.getByTestId('save-connector-button').click();

  // Verify created
  await expect(page.getByTestId('connector-card').filter({ hasText: 'Test Gemini' })).toBeVisible();

  // Test connection
  await page.getByTestId('test-connection-button').click();
  await expect(page.getByTestId('connection-status')).toContainText('Connected', {
    timeout: 15_000,
  });

  // Sync models
  await page.getByTestId('sync-models-button').click();
  await expect(page.getByTestId('sync-status')).toContainText('Synced', { timeout: 30_000 });

  // Verify models appeared
  await expect(page.getByTestId('model-count')).not.toContainText('0');
});
```

**Assertions:**

- Connector form validates required fields
- API key is masked after save
- Connection test shows success/failure status
- Model sync populates the model list
- Connector appears in the connectors list

### Journey 3: Settings -- Theme and Language Persistence

**File:** `tests/e2e/settings/preferences.spec.ts`

```typescript
test('change theme and verify persistence across refresh', async ({ page }) => {
  await page.goto('/settings');

  // Switch to dark theme (or light if already dark)
  await page.getByTestId('theme-toggle').click();
  const themeAfterToggle = await page.evaluate(() =>
    document.documentElement.classList.contains('dark'),
  );

  // Refresh page
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Verify theme persisted
  const themeAfterReload = await page.evaluate(() =>
    document.documentElement.classList.contains('dark'),
  );
  expect(themeAfterReload).toBe(themeAfterToggle);
});

test('change language and verify all text updates', async ({ page }) => {
  await page.goto('/settings');

  // Switch to Spanish
  await page.getByTestId('language-select').selectOption('es');

  // Verify sidebar labels changed
  await expect(page.getByTestId('sidebar-chat')).not.toContainText('Chat');
  // (Spanish translation should be present)

  // Verify persistence
  await page.reload();
  const selectedLang = await page.getByTestId('language-select').inputValue();
  expect(selectedLang).toBe('es');
});
```

### Journey 4: File Upload and Chat with Attachment

**File:** `tests/e2e/chat/file-attachment.spec.ts`

```typescript
test('upload file and send message with attachment', async ({ page }) => {
  // Navigate to chat thread
  await page.goto('/chat');
  await page.getByTestId('new-thread-button').click();

  // Upload a file
  const fileInput = page.getByTestId('file-upload-input');
  await fileInput.setInputFiles('tests/e2e/fixtures/sample-data.csv');

  // Wait for upload and chunking
  await expect(page.getByTestId('file-status')).toContainText('Ready', { timeout: 15_000 });

  // Attach the file to the message
  await page.getByTestId('attachment-picker').click();
  await page.getByTestId('file-checkbox').first().check();
  await page.getByTestId('attachment-confirm').click();

  // Send message referencing the file
  await page.getByTestId('message-composer').fill('Summarize this data file');
  await page.getByTestId('send-button').click();

  // Wait for AI response that references file content
  await expect(page.getByTestId('message-bubble-assistant').last()).toBeVisible({
    timeout: 60_000,
  });

  // Verify attachment indicator on user message
  await expect(page.getByTestId('attachment-indicator')).toBeVisible();
});
```

### Journey 5: Model Catalog -- Browse, Download, Track Progress

**File:** `tests/e2e/models/catalog.spec.ts`

```typescript
test('browse catalog, filter by category, download model', async ({ page }) => {
  await page.goto('/models/catalog');

  // Verify catalog loads with models
  await expect(page.getByTestId('catalog-model-card').first()).toBeVisible();

  // Filter by category
  await page.getByTestId('category-filter').selectOption('CODING');
  const cards = page.getByTestId('catalog-model-card');
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);

  // Verify all visible cards are coding models
  for (let i = 0; i < count; i++) {
    await expect(cards.nth(i).getByTestId('model-category')).toContainText('Coding');
  }

  // Download a small model (if not already downloaded)
  const downloadButton = page.getByTestId('download-button').first();
  if (await downloadButton.isVisible()) {
    await downloadButton.click();

    // Verify progress bar appears
    await expect(page.getByTestId('download-progress-bar')).toBeVisible({ timeout: 5_000 });

    // Verify active downloads panel shows the job
    await expect(page.getByTestId('active-downloads-panel')).toBeVisible();
  }
});
```

### Journey 6: Admin -- User Management and Role Assignment

**File:** `tests/e2e/admin/user-management.spec.ts`

```typescript
test('admin manages users and changes roles', async ({ page }) => {
  // Login as admin
  await page.goto('/login');
  await page.getByTestId('email-input').fill('admin@claw.ai');
  await page.getByTestId('password-input').fill('admin123');
  await page.getByTestId('login-button').click();
  await page.waitForURL('**/dashboard');

  // Navigate to admin
  await page.goto('/admin');

  // Verify user list loads
  await expect(page.getByTestId('user-row').first()).toBeVisible();

  // Find the operator user and change role to VIEWER
  const operatorRow = page.getByTestId('user-row').filter({ hasText: 'operator@claw.ai' });
  await operatorRow.getByTestId('role-select').selectOption('VIEWER');
  await operatorRow.getByTestId('save-role-button').click();

  // Verify role change persisted
  await page.reload();
  const updatedRole = await operatorRow.getByTestId('role-select').inputValue();
  expect(updatedRole).toBe('VIEWER');

  // Revert for test cleanup
  await operatorRow.getByTestId('role-select').selectOption('OPERATOR');
  await operatorRow.getByTestId('save-role-button').click();
});
```

---

## 3. Role-Based Access Flows

### RBAC Test Matrix

| Page/Action              | ADMIN       | OPERATOR    | VIEWER      |
| ------------------------ | ----------- | ----------- | ----------- |
| Dashboard                | Full access | Full access | Full access |
| Chat (send message)      | Yes         | Yes         | Read-only   |
| Connectors (create)      | Yes         | Yes         | No          |
| Connectors (delete)      | Yes         | No          | No          |
| Routing policies         | Yes         | View only   | View only   |
| Model catalog (download) | Yes         | Yes         | No          |
| Admin (user management)  | Yes         | No          | No          |
| Settings (own profile)   | Yes         | Yes         | Yes         |
| Audit logs               | Yes         | Yes         | View only   |
| Memory (delete)          | Yes         | Yes         | No          |

**File:** `tests/e2e/auth/rbac.spec.ts`

```typescript
test.describe('RBAC Enforcement', () => {
  test('VIEWER cannot send chat messages', async ({ page }) => {
    // Login as viewer
    await loginAs(page, 'viewer@claw.ai', 'viewer123');
    await page.goto('/chat');

    // Verify send button is disabled or hidden
    const sendButton = page.getByTestId('send-button');
    await expect(sendButton).toBeDisabled();
  });

  test('OPERATOR cannot access admin page', async ({ page }) => {
    await loginAs(page, 'operator@claw.ai', 'operator123');
    await page.goto('/admin');

    // Should redirect to dashboard or show forbidden
    await expect(page).not.toHaveURL('**/admin');
  });

  test('ADMIN sees all sidebar items', async ({ page }) => {
    await loginAs(page, 'admin@claw.ai', 'admin123');
    await expect(page.getByTestId('sidebar-admin')).toBeVisible();
    await expect(page.getByTestId('sidebar-connectors')).toBeVisible();
    await expect(page.getByTestId('sidebar-routing')).toBeVisible();
  });
});
```

---

## 4. Auth Flow Tests

**File:** `tests/e2e/auth/auth-flow.spec.ts`

```typescript
test.describe('Authentication', () => {
  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('email-input').fill('admin@claw.ai');
    await page.getByTestId('password-input').fill('admin123');
    await page.getByTestId('login-button').click();
    await expect(page).toHaveURL('**/dashboard', { timeout: 10_000 });
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('email-input').fill('admin@claw.ai');
    await page.getByTestId('password-input').fill('wrongpassword');
    await page.getByTestId('login-button').click();
    await expect(page.getByTestId('login-error')).toBeVisible();
    await expect(page).toHaveURL('**/login');
  });

  test('expired session redirects to login', async ({ page }) => {
    // Login first
    await loginAs(page, 'admin@claw.ai', 'admin123');

    // Clear tokens to simulate expiry
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Navigate to protected page
    await page.goto('/chat');
    await expect(page).toHaveURL('**/login', { timeout: 10_000 });
  });

  test('logout clears session and redirects', async ({ page }) => {
    await loginAs(page, 'admin@claw.ai', 'admin123');

    await page.getByTestId('user-menu').click();
    await page.getByTestId('logout-button').click();
    await expect(page).toHaveURL('**/login', { timeout: 10_000 });

    // Verify cannot access protected pages
    await page.goto('/chat');
    await expect(page).toHaveURL('**/login');
  });
});
```

---

## 5. Wait Strategy

### Selector Strategy

**Always use `data-testid` attributes.** Never select by CSS class, tag name, or text content alone.

```typescript
// GOOD
await page.getByTestId('send-button').click();
await page.getByTestId('message-bubble-assistant').last();

// BAD -- fragile, breaks on CSS/text changes
await page.locator('.btn-primary').click();
await page.locator('text=Send').click();
```

### Wait Patterns

```typescript
// Wait for navigation
await page.waitForURL('**/chat', { timeout: 5_000 });

// Wait for network idle (page fully loaded)
await page.waitForLoadState('networkidle');

// Wait for specific element
await expect(page.getByTestId('message-bubble-assistant')).toBeVisible({ timeout: 60_000 });

// Wait for SSE event (poll for element appearance)
await expect(async () => {
  const count = await page.getByTestId('message-bubble-assistant').count();
  expect(count).toBeGreaterThan(0);
}).toPass({ timeout: 60_000, intervals: [1_000] });

// Wait for API response in background
const responsePromise = page.waitForResponse(
  (response) => response.url().includes('/chat-messages') && response.status() === 201,
);
await page.getByTestId('send-button').click();
await responsePromise;
```

### Timeout Guidelines

| Operation             | Timeout |
| --------------------- | ------- |
| Page navigation       | 5s      |
| Element visibility    | 10s     |
| API response          | 15s     |
| LLM response (Ollama) | 60s     |
| LLM response (cloud)  | 30s     |
| Model download        | 300s    |
| SSE event arrival     | 30s     |

---

## 6. Error Flow Tests

**File:** `tests/e2e/errors/error-handling.spec.ts`

```typescript
test.describe('Error Handling', () => {
  test('shows error toast on network failure', async ({ page }) => {
    await loginAs(page, 'admin@claw.ai', 'admin123');
    await page.goto('/chat');

    // Simulate network failure
    await page.route('**/api/v1/chat-messages', (route) => route.abort());

    await page.getByTestId('message-composer').fill('Test message');
    await page.getByTestId('send-button').click();

    // Verify error feedback
    await expect(page.getByTestId('error-toast')).toBeVisible({ timeout: 5_000 });
  });

  test('shows error message when LLM fails', async ({ page }) => {
    await loginAs(page, 'admin@claw.ai', 'admin123');

    // Navigate to a thread (the LLM error message appears as an ASSISTANT message
    // with error metadata -- the frontend renders it differently)
    await page.goto('/chat');
    await page.getByTestId('new-thread-button').click();

    // Send a message that might trigger a provider failure
    // (This tests the error message storage pattern)
    await page.getByTestId('message-composer').fill('Test');
    await page.getByTestId('send-button').click();

    // Wait for response (could be success or error message)
    await expect(page.getByTestId('message-bubble-assistant').last()).toBeVisible({
      timeout: 60_000,
    });
  });
});
```

---

## 7. Screenshot and Artifact Capture

### Automatic Capture on Failure

Playwright config already sets `screenshot: 'only-on-failure'` and `video: 'retain-on-failure'`. Additionally, capture console logs:

```typescript
test.beforeEach(async ({ page }) => {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`Browser console error: ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => {
    console.log(`Page error: ${err.message}`);
  });
});
```

### Manual Screenshot in Tests

```typescript
test('visual verification of dashboard', async ({ page }) => {
  await loginAs(page, 'admin@claw.ai', 'admin123');
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  // Named screenshot for visual comparison
  await page.screenshot({ path: 'tests/e2e/screenshots/dashboard.png', fullPage: true });
});
```

### Artifact Storage

```
tests/e2e/
  screenshots/          # Named screenshots (for visual comparison)
  playwright-report/    # HTML report (auto-generated)
  test-results/         # Traces, videos, failure screenshots (auto-generated)
```

---

## 8. Environment and CI

### Running Locally

```bash
# Install Playwright browsers (first time only)
cd apps/claw-frontend
npx playwright install

# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test tests/e2e/chat/send-message.spec.ts

# Run with UI mode (debugging)
npx playwright test --ui

# Run with headed browser (see the browser)
npx playwright test --headed

# View last report
npx playwright show-report
```

### CI Pipeline

E2E tests run after unit tests and build pass. They require the full Docker Compose stack:

```yaml
# In .github/workflows/ci.yml (E2E job)
e2e:
  needs: [build]
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Start Docker Compose
      run: ./scripts/claw.sh up -d --wait
    - name: Wait for services
      run: |
        for i in $(seq 1 60); do
          curl -f http://localhost:4000/api/v1/health && break
          sleep 5
        done
    - name: Install Playwright
      run: cd apps/claw-frontend && npx playwright install --with-deps
    - name: Run E2E tests
      run: cd apps/claw-frontend && npx playwright test
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: apps/claw-frontend/playwright-report/
```

---

## 9. Test File Organization

```
apps/claw-frontend/tests/e2e/
  fixtures/
    test-data.ts                    # Shared test constants
    sample-data.csv                 # Test file for upload tests
    sample-image.png                # Test image for upload tests
  helpers/
    auth.helper.ts                  # loginAs(), getToken() utilities
    wait.helper.ts                  # Custom wait utilities for SSE
  auth/
    login.spec.ts                   # Login happy/error paths
    logout.spec.ts                  # Logout and session cleanup
    session-expiry.spec.ts          # Token expiry and redirect
    rbac.spec.ts                    # Role-based access enforcement
  chat/
    send-message.spec.ts            # Basic message send/receive
    thread-crud.spec.ts             # Create, rename, delete threads
    file-attachment.spec.ts         # Upload and attach files
    parallel-compare.spec.ts        # Multi-model parallel comparison
    thread-settings.spec.ts         # System prompt, temp, model selection
  connectors/
    connector-crud.spec.ts          # Create, edit, delete connectors
    connection-test.spec.ts         # Test connection button
    model-sync.spec.ts              # Sync models from provider
  models/
    catalog.spec.ts                 # Browse and filter catalog
    download.spec.ts                # Download model with progress
    role-assignment.spec.ts         # Assign model roles
  routing/
    routing-modes.spec.ts           # Verify all 7 routing modes
    replay-lab.spec.ts              # Routing replay functionality
  settings/
    preferences.spec.ts             # Theme, language, profile
    password-change.spec.ts         # Change password flow
  admin/
    user-management.spec.ts         # User CRUD, role changes
    audit-logs.spec.ts              # View audit trail
  errors/
    error-handling.spec.ts          # Network failures, service down
```

---

## 10. Assertion Best Practices

### DOM State Assertions

```typescript
// Element visible
await expect(page.getByTestId('element')).toBeVisible();

// Element contains text
await expect(page.getByTestId('element')).toContainText('expected');

// Element has specific attribute
await expect(page.getByTestId('element')).toHaveAttribute('aria-disabled', 'true');

// Count of elements
await expect(page.getByTestId('message-bubble-assistant')).toHaveCount(3);

// URL assertion
await expect(page).toHaveURL('**/chat/**');
```

### API Response Assertions (when critical)

```typescript
// Intercept and verify API response
const response = await page.waitForResponse('**/api/v1/chat-messages');
expect(response.status()).toBe(201);

const body = await response.json();
expect(body.id).toBeTruthy();
expect(body.role).toBe('USER');
```

### DB State Assertions (for critical flows only)

For flows where UI alone is insufficient (e.g., verifying audit log was created), use API endpoints to query the data rather than direct DB access from Playwright:

```typescript
// Verify via API instead of direct DB query
const auditResponse = await page.request.get('/api/v1/audits?action=message.completed', {
  headers: { Authorization: `Bearer ${token}` },
});
const audits = await auditResponse.json();
expect(audits.data.length).toBeGreaterThan(0);
```

---

## 11. Common Pitfalls

| Pitfall                              | Solution                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------- |
| Tests flake due to LLM response time | Use generous timeouts (60s) for LLM operations; poll with `toPass()`      |
| Auth state leaks between tests       | Use `test.beforeEach` to login fresh; clear storage if needed             |
| SSE events missed                    | Start listening BEFORE triggering the action                              |
| File upload not working in CI        | Ensure test fixtures are committed; use relative paths from test dir      |
| Selectors break after UI changes     | Always use `data-testid`; never select by CSS class or visible text alone |
| Tests pass locally, fail in CI       | Check Docker service health; add explicit waits; verify seed data exists  |
| Parallel tests corrupt shared state  | Run with `workers: 1` and `fullyParallel: false` for stateful flows       |
| Stale page after navigation          | Call `waitForLoadState('networkidle')` after `goto()`                     |
