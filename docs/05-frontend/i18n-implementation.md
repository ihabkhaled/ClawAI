# Internationalization (i18n) Implementation

> Complete guide to the 13-language URL-authoritative i18n system, RTL support,
> and adding new translations.

---

## 1. Supported Languages

| Code | Language   | Direction | Locale File                  |
| ---- | ---------- | --------- | ---------------------------- |
| `en` | English    | LTR       | `src/lib/i18n/locales/en.ts` |
| `ar` | Arabic     | RTL       | `src/lib/i18n/locales/ar.ts` |
| `de` | German     | LTR       | `src/lib/i18n/locales/de.ts` |
| `es` | Spanish    | LTR       | `src/lib/i18n/locales/es.ts` |
| `fr` | French     | LTR       | `src/lib/i18n/locales/fr.ts` |
| `it` | Italian    | LTR       | `src/lib/i18n/locales/it.ts` |
| `pt` | Portuguese | LTR       | `src/lib/i18n/locales/pt.ts` |
| `ru` | Russian    | LTR       | `src/lib/i18n/locales/ru.ts` |
| `hi` | Hindi      | LTR       | `src/lib/i18n/locales/hi.ts` |
| `ja` | Japanese   | LTR       | `src/lib/i18n/locales/ja.ts` |
| `th` | Thai       | LTR       | `src/lib/i18n/locales/th.ts` |
| `fa` | Persian    | RTL       | `src/lib/i18n/locales/fa.ts` |
| `zh` | Simplified Chinese | LTR | `src/lib/i18n/locales/zh.ts` |

---

## 2. Architecture

### File Structure

```
src/lib/i18n/
  locales/
    en.ts    # English (primary, all keys defined here first)
    ar.ts    # Arabic
    de.ts    # German
    es.ts    # Spanish
    fr.ts    # French
    it.ts    # Italian
    pt.ts    # Portuguese
    ru.ts    # Russian
    hi.ts    # Hindi
    ja.ts    # Japanese
    th.ts    # Thai
    fa.ts    # Persian
    zh.ts    # Simplified Chinese
  index.ts   # LocaleProvider, useTranslation hook export

src/types/i18n.types.ts   # Type-safe translation key definitions
src/hooks/use-locale.ts   # Locale management hook
src/enums/locale.enum.ts  # Locale enum values
```

### Provider Setup

The `LocaleProvider` wraps the entire application in `src/app/providers.tsx`:

```tsx
<LocaleProvider initialLocale={serverLocale}>
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </ThemeProvider>
</LocaleProvider>
```

### Translation Dictionary Structure

Each locale file exports a typed dictionary object:

```typescript
// src/lib/i18n/locales/en.ts
import type { TranslationDictionary } from '@/types/i18n.types';

export const en: TranslationDictionary = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    search: 'Search',
    loading: 'Loading...',
    noResults: 'No results found',
    // ... more common keys
  },
  auth: {
    login: 'Login',
    logout: 'Logout',
    email: 'Email',
    password: 'Password',
    // ...
  },
  chat: {
    newThread: 'New Chat',
    sendMessage: 'Send',
    messageSendFailed: 'Failed to send message',
    // ...
  },
  // ... more domain sections
};
```

---

## 3. Usage in Components

### The useTranslation Hook

```typescript
import { useTranslation } from '@/lib/i18n';

function MyComponent(): ReactElement {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('common.noResults')}</p>
      <Button>{t('common.save')}</Button>
    </div>
  );
}
```

### Rules

1. **Never hardcode user-facing text** -- always use `t('key')`
2. **All 13 locale files must stay in sync** -- every key in `en.ts` must exist in all others
3. **Keys are type-safe** -- TypeScript will error if you use a key that does not exist
4. **Domain-organized** -- keys are grouped by feature area (common, auth, chat, connectors, etc.)

---

## 4. Adding New Translations

### Step 1: Add the key to the TypeScript type definition

Edit `src/types/i18n.types.ts` to add the new key:

```typescript
export type TranslationDictionary = {
  common: {
    // ... existing keys
    newKey: string; // Add here
  };
  // ...
};
```

### Step 2: Add English text to `en.ts`

```typescript
// src/lib/i18n/locales/en.ts
common: {
  // ... existing
  newKey: 'The English text',
},
```

### Step 3: Add native translations to all 12 remaining locale files

You must add the corresponding translation to each file:

- `ar.ts` -- Arabic translation
- `de.ts` -- German translation
- `es.ts` -- Spanish translation
- `fr.ts` -- French translation
- `it.ts` -- Italian translation
- `pt.ts` -- Portuguese translation
- `ru.ts` -- Russian translation
- `hi.ts` -- Hindi translation
- `ja.ts` -- Japanese translation
- `th.ts` -- Thai translation
- `fa.ts` -- Persian translation
- `zh.ts` -- Simplified Chinese translation

### Step 4: Use in component

```tsx
const { t } = useTranslation();
return <span>{t('common.newKey')}</span>;
```

### Checklist for New Text

- [ ] Key added to `src/types/i18n.types.ts`
- [ ] English text added to `en.ts`
- [ ] Arabic translation added to `ar.ts`
- [ ] German translation added to `de.ts`
- [ ] Spanish translation added to `es.ts`
- [ ] French translation added to `fr.ts`
- [ ] Italian translation added to `it.ts`
- [ ] Portuguese translation added to `pt.ts`
- [ ] Russian translation added to `ru.ts`
- [ ] Hindi translation added to `hi.ts`
- [ ] Japanese translation added to `ja.ts`
- [ ] Thai translation added to `th.ts`
- [ ] Persian translation added to `fa.ts`
- [ ] Simplified Chinese translation added to `zh.ts`
- [ ] Used via `t('key')` in component (never hardcoded)

---

## 5. RTL Support (Arabic and Persian)

Arabic and Persian use right-to-left text direction. The application handles this by:

1. **Global `dir` attribute**: For `/ar/*` and `/fa/*`, `dir="rtl"` is server-rendered on the HTML root
2. **CSS logical properties**: Tailwind CSS logical properties (`ms-`, `me-`, `ps-`, `pe-`) are preferred over `ml-`, `mr-`, `pl-`, `pr-` for correct RTL behavior
3. **Layout mirroring**: Sidebar, navigation, and content areas are automatically mirrored

### RTL-Safe Styling

```tsx
// CORRECT -- uses logical properties (works in both LTR and RTL)
<div className="ms-4 ps-2" />

// LESS IDEAL -- physical properties (may need RTL override)
<div className="ml-4 pl-2" />
```

### Testing RTL

To test Arabic RTL layout:

1. Go to Settings page
2. Change language to Arabic
3. Verify sidebar appears on the right
4. Verify text alignment is right-to-left
5. Verify form inputs align correctly

---

## 6. URL authority and preference persistence

The locale prefix is authoritative. Middleware validates it, stamps
`x-claw-locale`, and the root layout passes that server locale to
`LocaleProvider`. Storage and account preferences can influence a future
redirect, but cannot change the language rendered for an already-prefixed URL.

The user's language preference is stored in the user profile via the settings page:

1. User selects language in Settings
2. `useUpdatePreferences` mutation sends to backend
3. Backend stores in user preferences
4. On next login, `usePreferenceBootstrap` reads the saved preference and applies it
5. The `UserLanguagePreference` enum maps to locale codes

---

## 7. Translation Key Organization

Keys are organized by domain to keep them manageable:

| Section      | Purpose                  | Example Keys                         |
| ------------ | ------------------------ | ------------------------------------ |
| `common`     | Shared across features   | save, cancel, delete, loading, error |
| `auth`       | Authentication screens   | login, logout, email, password       |
| `chat`       | Chat feature             | newThread, sendMessage, noMessages   |
| `connectors` | Connector management     | create, testConnection, syncModels   |
| `models`     | Model management         | localModels, pullModel, assignRole   |
| `routing`    | Routing policies         | createPolicy, autoMode, decisions    |
| `memory`     | Memory management        | createMemory, memoryTypes, toggle    |
| `files`      | File management          | upload, processing, download         |
| `audit`      | Audit logs               | auditLog, usageStats, actions        |
| `logs`       | Log viewer               | clientLogs, serverLogs, level        |
| `settings`   | User settings            | appearance, language, changePassword |
| `admin`      | Admin page               | userManagement, roles                |
| `dashboard`  | Dashboard                | title, recentActivity, systemHealth  |
| `health`     | Health/observability     | healthy, degraded, unhealthy         |
| `validation` | Form validation messages | required, tooLong, invalidEmail      |
| `errors`     | Error messages           | serverError, networkError            |

---

## 8. Testing Translation Completeness

A test in `src/lib/i18n/__tests__/` verifies that all 13 locale files have the
same keys and interpolation placeholders as English. This prevents missing or
structurally incompatible translations from reaching production.

The test iterates over all keys in `en.ts` and asserts they exist in every other locale file.
