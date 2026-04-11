# Settings & Preferences Product Specification

## Overview

ClawAI provides user-level settings for appearance, language, and account management. Settings are stored in the User record and applied at login. The platform supports 8 languages with full RTL support for Arabic.

---

## Theme Settings

### Dark/Light Mode

- **System Preference**: Automatically matches the operating system theme
- **Manual Override**: User can explicitly select light or dark mode
- **Implementation**: CSS variables (`--background`, `--foreground`, `--primary`, etc.)
- **No `dark:` prefix**: Theme switching is handled entirely through CSS variable swapping
- **Persistence**: Theme preference stored in User record, applied at login

### Semantic Color Variables

| Variable | Purpose |
| --- | --- |
| `--background` | Page background |
| `--foreground` | Primary text |
| `--card` | Card backgrounds |
| `--primary` | Primary action color |
| `--secondary` | Secondary elements |
| `--muted` | Muted backgrounds |
| `--muted-foreground` | Muted text |
| `--accent` | Accent highlights |
| `--destructive` | Error/danger actions |
| `--border` | Border color |

---

## Language Selection

### 8 Supported Languages

| Code | Language | Direction | Locale File |
| --- | --- | --- | --- |
| en | English | LTR | `en.ts` |
| ar | Arabic | RTL | `ar.ts` |
| de | German | LTR | `de.ts` |
| es | Spanish | LTR | `es.ts` |
| fr | French | LTR | `fr.ts` |
| it | Italian | LTR | `it.ts` |
| pt | Portuguese | LTR | `pt.ts` |
| ru | Russian | LTR | `ru.ts` |

### i18n Implementation

- All user-facing text uses `t('key')` from `useTranslation()` hook
- No hardcoded text in components
- Locale files: `src/lib/i18n/locales/{en,ar,de,es,fr,it,pt,ru}.ts`
- Type-safe keys defined in `src/types/i18n.types.ts`
- Language preference persisted in User record

### RTL Support (Arabic)

- Full right-to-left layout when Arabic is selected
- Sidebar, navigation, and content flow reverse
- Form labels and inputs align right
- Icons and directional elements mirror

---

## Account Settings

### Password Change

- Requires current password for verification
- New password validated via Zod schema
- Password hashed with argon2 before storage
- All existing sessions remain valid (user is not logged out)

### Profile Information

- View: Email, username, role (read-only)
- Update: Username (admin can change email)

---

## Thread Settings (Per-Thread)

While not strictly "settings," these are user-configurable preferences per conversation:

| Setting | Range | Default | Description |
| --- | --- | --- | --- |
| Routing Mode | 7 modes | AUTO | How messages are routed |
| System Prompt | 0-10,000 chars | None | AI persona/instructions |
| Temperature | 0.0-2.0 | Provider default | Creativity/randomness |
| Max Tokens | 1-32,000 | Provider default | Maximum response length |
| Preferred Provider | Any active | None | Force a specific provider |
| Preferred Model | Any synced | None | Force a specific model |
| Context Packs | Up to 10 | None | Attached knowledge packs |

---

## Settings Page Layout

```
Settings
  +-- Appearance
  |     +-- Theme: System / Light / Dark
  |     +-- Language: Dropdown (8 options)
  |
  +-- Account
  |     +-- Profile (email, username, role - read only)
  |     +-- Change Password
  |
  +-- About
        +-- Version info
        +-- System status link
```

---

## Data Model

User preferences are stored in the `preferences` JSON field on the User record:

```
User.preferences: {
  theme: "system" | "light" | "dark"
  language: "en" | "ar" | "de" | "es" | "fr" | "it" | "pt" | "ru"
}
```

These are loaded into the Zustand auth store at login and applied immediately.
