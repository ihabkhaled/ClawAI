# Styling Guide

> Tailwind CSS, CSS variables, dark mode, cn() utility, and design system rules.

---

## 1. Design System Overview

ClawAI uses a CSS-variable-driven design system with Tailwind CSS for utility classes. Dark mode is handled automatically through CSS variables -- no `dark:` prefixes are used anywhere.

| Layer           | Technology           | Purpose                              |
| --------------- | -------------------- | ------------------------------------ |
| Design Tokens   | CSS Custom Properties| Colors, spacing, radius, shadows     |
| Utility Classes | Tailwind CSS         | Layout, spacing, typography          |
| Components      | shadcn/ui + Radix UI | Form inputs, dialogs, menus          |
| Icons           | Lucide React         | Consistent icon set                  |
| Class Merging   | cn() utility         | Conditional class composition        |

---

## 2. CSS Variables (Design Tokens)

All colors are defined as CSS custom properties in `src/app/globals.css`. Themes switch by changing these variable values.

### Core Variables

```css
--background          /* Page background */
--foreground          /* Primary text color */
--primary             /* Primary action color */
--primary-foreground  /* Text on primary color */
--secondary           /* Secondary surfaces */
--secondary-foreground
--muted               /* Muted/disabled surfaces */
--muted-foreground    /* Secondary text */
--accent              /* Hover/active highlight */
--accent-foreground
--destructive         /* Error/danger color */
--destructive-foreground
--card                /* Card background */
--card-foreground     /* Card text */
--popover             /* Popover/dropdown background */
--popover-foreground
--border              /* Border color */
--input               /* Input border color */
--ring                /* Focus ring color */
--radius              /* Border radius */
```

### Theme Detection

Theme is detected from:
1. System preference via `prefers-color-scheme`
2. User override stored in auth preferences
3. Applied by the ThemeProvider in `src/lib/theme/`

---

## 3. Tailwind CSS Rules

### Use Semantic Classes Only

```tsx
// CORRECT -- semantic color classes tied to CSS variables
<div className="bg-background text-foreground border-border" />
<p className="text-muted-foreground" />
<button className="bg-primary text-primary-foreground" />
<span className="text-destructive" />

// WRONG -- raw color values
<div className="bg-white text-black border-gray-200" />
<button className="bg-blue-600 text-white" />
```

### No dark: Prefixes

```tsx
// WRONG -- manual dark mode
<div className="bg-white dark:bg-gray-900 text-black dark:text-white" />

// CORRECT -- CSS variables handle it automatically
<div className="bg-background text-foreground" />
```

### No Inline Styles

```tsx
// WRONG
<div style={{ marginTop: '16px', color: 'red' }} />

// CORRECT
<div className="mt-4 text-destructive" />
```

### Mobile-First Responsive Design

Use Tailwind breakpoints with mobile-first approach:

```tsx
// Mobile: 1 column, md: 2 columns, lg: 3 columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" />

// Mobile: full width, md: half width
<div className="w-full md:w-1/2" />

// Mobile: stack, md: flex row
<div className="flex flex-col md:flex-row gap-4" />
```

Breakpoints:
- `sm:` -- 640px+
- `md:` -- 768px+
- `lg:` -- 1024px+
- `xl:` -- 1280px+

---

## 4. The cn() Utility

Located in `src/lib/utils.ts`, `cn()` wraps `clsx` and `tailwind-merge` for safe conditional class composition:

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

### Usage Patterns

```tsx
import { cn } from '@/lib/utils';

// Conditional classes
<div
  className={cn(
    'flex items-center gap-2 rounded-md p-3',
    isActive && 'bg-accent text-accent-foreground',
    isDisabled && 'opacity-50 pointer-events-none',
  )}
/>

// Variant-based styling
<Badge
  className={cn(
    'text-xs',
    variant === 'success' && 'bg-green-100 text-green-800',
    variant === 'error' && 'bg-destructive text-destructive-foreground',
  )}
/>

// Merging with prop classes
function Card({ className, children }: CardProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      {children}
    </div>
  );
}
```

### Why cn() instead of plain template literals

`tailwind-merge` resolves conflicting Tailwind classes. Without it:

```tsx
// Without cn(): both padding values remain, causing unpredictable results
`p-4 ${className}` // className = "p-8" -> "p-4 p-8" (conflict!)

// With cn(): conflicting values are resolved (last wins)
cn('p-4', className) // className = "p-8" -> "p-8" (correct!)
```

---

## 5. shadcn/ui Components

All form controls use shadcn/ui components (built on Radix UI primitives):

### Form Inputs (MUST use these, never raw HTML)
- `Input` -- text input
- `Textarea` -- multi-line text
- `Select` -- dropdown selection
- `Checkbox` -- boolean toggle
- `Switch` -- on/off toggle
- `Slider` -- range input

### Overlay Components
- `Dialog` -- modal dialogs
- `Sheet` -- slide-out panels
- `Popover` -- floating content
- `DropdownMenu` -- action menus
- `Tooltip` -- hover hints

### Display Components
- `Button` -- all clickable actions
- `Badge` -- status labels
- `Card` -- content containers
- `Table` -- tabular data
- `Tabs` -- tabbed navigation
- `Toast` -- notification popups

### Rules
- shadcn/ui files in `src/components/ui/` are auto-generated -- **never edit manually**
- Always use shadcn/ui over raw HTML elements
- Compose shadcn/ui primitives in feature components

---

## 6. Icons

Lucide React is the exclusive icon library:

```tsx
import { Search, Plus, Trash2, Settings } from 'lucide-react';

<Button>
  <Plus className="mr-2 h-4 w-4" />
  {t('common.create')}
</Button>
```

No other icon libraries are permitted.

---

## 7. Common Spacing Patterns

```tsx
// Page container
<div className="container mx-auto p-6" />

// Section spacing
<div className="space-y-6" />

// Card with consistent padding
<Card className="p-6" />

// List items
<div className="flex items-center gap-3 py-2" />

// Form layout
<div className="grid gap-4">
  <div className="grid gap-2">
    <Label>{t('field.label')}</Label>
    <Input />
  </div>
</div>
```

---

## 8. Status Colors

Status indicators use a semantic color mapping:

| Status     | Background Class              | Text Class                     |
| ---------- | ----------------------------- | ------------------------------ |
| Healthy    | `bg-green-100`                | `text-green-800`               |
| Degraded   | `bg-yellow-100`               | `text-yellow-800`              |
| Unhealthy  | `bg-red-100`                  | `text-red-800`                 |
| Info       | `bg-blue-100`                 | `text-blue-800`                |
| Inactive   | `bg-muted`                    | `text-muted-foreground`        |

These are applied through the `StatusBadge` component and utility functions in `src/utilities/health-status.utility.ts`.

---

## 9. Styling Checklist

Before submitting styling changes, verify:

- [ ] No `dark:` prefixes anywhere
- [ ] No raw color classes (`text-blue-500`) for semantic meaning
- [ ] No inline styles (`style={{ ... }}`)
- [ ] All conditional classes use `cn()`
- [ ] All form inputs use shadcn/ui components
- [ ] All icons from Lucide React
- [ ] Mobile-first responsive breakpoints
- [ ] CSS variables used for all theme-dependent colors
