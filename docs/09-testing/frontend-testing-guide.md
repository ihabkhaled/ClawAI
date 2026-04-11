# Frontend Testing Guide

> Vitest patterns, testing hooks, testing components, MSW mocking, and examples.

---

## 1. Configuration

Frontend tests use Vitest with jsdom environment:

- **Extension**: `*.test.ts` / `*.test.tsx`
- **Location**: `__tests__/` directories adjacent to source
- **Config**: `vitest.config.ts` in `apps/claw-frontend/`
- **Environment**: jsdom (provides DOM APIs)
- **Path aliases**: `@/` maps to `src/`

### File Structure

```
apps/claw-frontend/src/
  components/common/
    __tests__/
      empty-state.test.tsx
      loading-spinner.test.tsx
      page-header.test.tsx
      status-badge.test.tsx
  hooks/
    __tests__/
      use-auth-guard.test.ts
      use-debounce.test.ts
  lib/validation/
    __tests__/
      login.schema.test.ts
      connector.schema.test.ts
      memory.schema.test.ts
      routing.schema.test.ts
      # ... 8 schema test files
  utilities/
    __tests__/
      api.utility.test.ts
      cn.utility.test.ts
      preference.utility.test.ts
      sse.utility.test.ts
      string.utility.test.ts
      toast.utility.test.ts
  repositories/
    __tests__/
      auth.repository.test.ts
      query-keys.test.ts
  stores/
    __tests__/
      auth.store.test.ts
  enums/
    __tests__/
      enums.test.ts
  lib/i18n/
    __tests__/
      locale-context.test.ts
      translations.test.ts
```

---

## 2. Testing Components

### Rendering Tests

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('EmptyState', () => {
  it('should render the title and description', () => {
    render(
      <EmptyState
        title="No results"
        description="Try a different search"
      />,
    );

    expect(screen.getByText('No results')).toBeDefined();
    expect(screen.getByText('Try a different search')).toBeDefined();
  });

  it('should render the action button when provided', () => {
    render(
      <EmptyState
        title="No items"
        action={{ label: 'Create', onClick: vi.fn() }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Create' })).toBeDefined();
  });

  it('should not render action button when not provided', () => {
    render(<EmptyState title="Empty" />);

    expect(screen.queryByRole('button')).toBeNull();
  });
});
```

### Component Testing Rules

1. Test rendering behavior, not implementation details
2. Test that correct content appears based on props
3. Test loading, empty, and error states
4. Test user interactions (click, type, submit)
5. Do not test internal state -- test visible behavior

---

## 3. Testing Hooks

Use `renderHook` from `@testing-library/react`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('should debounce value updates', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'hello' } },
    );

    rerender({ value: 'world' });
    expect(result.current).toBe('hello'); // Not yet updated

    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('world'); // Now updated
  });
});
```

### Testing Auth Guard Hook

```typescript
describe('useAuthGuard', () => {
  it('should redirect to login when not authenticated', () => {
    // Mock useAuthStore to return unauthenticated state
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: false,
      user: null,
    });

    const mockRouter = { push: vi.fn() };
    vi.mocked(useRouter).mockReturnValue(mockRouter);

    renderHook(() => useAuthGuard());

    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });
});
```

---

## 4. Testing Validation Schemas

```typescript
import { describe, expect, it } from 'vitest';
import { loginSchema } from '../login.schema';

describe('loginSchema', () => {
  it('should accept valid credentials', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('email');
    }
  });

  it('should reject empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing fields', () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBeGreaterThanOrEqual(2);
  });
});
```

---

## 5. Testing Utilities

```typescript
import { describe, expect, it } from 'vitest';
import { cn } from '../cn.utility';

describe('cn', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('base', true && 'active', false && 'hidden')).toBe('base active');
  });

  it('should resolve Tailwind conflicts', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8');
  });

  it('should handle undefined and null', () => {
    expect(cn('base', undefined, null)).toBe('base');
  });
});
```

---

## 6. Testing Stores (Zustand)

```typescript
import { describe, expect, it, beforeEach } from 'vitest';
import { useAuthStore } from '../auth.store';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('should have correct initial state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it('should set auth data correctly', () => {
    useAuthStore.getState().setAuth({
      accessToken: 'token-123',
      refreshToken: 'refresh-456',
      user: { id: 'user-1', email: 'test@test.com', role: 'ADMIN' },
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('token-123');
    expect(state.user?.email).toBe('test@test.com');
  });

  it('should clear auth data', () => {
    useAuthStore.getState().setAuth({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: 'user-1' },
    });

    useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });
});
```

---

## 7. Testing Repositories

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { authRepository } from '../auth.repository';

// Mock the HTTP client
vi.mock('@/lib/http-client', () => ({
  httpClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('authRepository', () => {
  it('should call login endpoint with correct data', async () => {
    const mockResponse = {
      data: { accessToken: 'token', refreshToken: 'refresh', user: {} },
    };
    vi.mocked(httpClient.post).mockResolvedValue(mockResponse);

    await authRepository.login({ email: 'test@test.com', password: 'pass' });

    expect(httpClient.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@test.com',
      password: 'pass',
    });
  });
});
```

---

## 8. Testing i18n

### Translation Completeness Test

```typescript
import { describe, expect, it } from 'vitest';
import { en } from '../locales/en';
import { ar } from '../locales/ar';
import { de } from '../locales/de';
// ... all locales

describe('Translation completeness', () => {
  const locales = { ar, de, es, fr, it, pt, ru };

  function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
    return Object.entries(obj).flatMap(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null) {
        return getKeys(value as Record<string, unknown>, fullKey);
      }
      return [fullKey];
    });
  }

  const enKeys = getKeys(en);

  for (const [name, locale] of Object.entries(locales)) {
    it(`${name} should have all English keys`, () => {
      const localeKeys = getKeys(locale);
      for (const key of enKeys) {
        expect(localeKeys).toContain(key);
      }
    });
  }
});
```

---

## 9. Mocking Patterns

### Next.js Router

```typescript
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useParams: () => ({ threadId: 'test-id' }),
  useSearchParams: () => new URLSearchParams(),
}));
```

### i18n

```typescript
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
```

### Browser APIs

```typescript
// localStorage
const mockStorage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
});

// matchMedia
vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));
```

---

## 10. Running Frontend Tests

```bash
# All frontend tests
npm run test --workspace=apps/claw-frontend

# Watch mode (default in Vitest)
cd apps/claw-frontend && npx vitest

# Run once
cd apps/claw-frontend && npx vitest run

# Single file
cd apps/claw-frontend && npx vitest src/utilities/__tests__/string.utility.test.ts

# Coverage
cd apps/claw-frontend && npx vitest --coverage

# UI mode
cd apps/claw-frontend && npx vitest --ui
```

### Known Issues

- Frontend tests may fail on the host with Node.js v24+ due to rollup native binary issues. Run inside Docker or use the vitest process cache.
