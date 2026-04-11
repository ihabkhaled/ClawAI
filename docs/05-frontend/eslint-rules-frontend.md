# ESLint Rules -- Frontend

> All ESLint rules, no-restricted-syntax selectors, and file-specific restrictions for the frontend.

---

## 1. ESLint Configuration

**File**: `apps/claw-frontend/eslint.config.mjs` (flat config, ESLint 9)

### Active Plugins

| Plugin                       | Purpose                           |
| ---------------------------- | --------------------------------- |
| `typescript-eslint` (strict) | TypeScript-specific rules         |
| `eslint-plugin-security`     | Security anti-patterns            |
| `eslint-plugin-unicorn`      | Modern JavaScript patterns        |
| `eslint-plugin-import-x`     | Import organization and ordering  |
| `eslint-plugin-react`        | React-specific rules              |
| `eslint-plugin-react-hooks`  | Rules of hooks, exhaustive deps   |
| `eslint-plugin-jsx-a11y`     | Accessibility (a11y) rules        |

---

## 2. TypeScript Rules

### Errors (must fix)

| Rule                           | Description                              |
| ------------------------------ | ---------------------------------------- |
| `no-explicit-any`              | Use `unknown` or generics, never `any`   |
| `no-unused-vars`               | Remove unused variables (except `_`-prefixed) |
| `no-non-null-assertion`        | No `!` operator -- handle null explicitly |
| `no-floating-promises`         | All promises must be awaited or voided   |
| `no-misused-promises`          | No promises in boolean/void positions    |
| `default-param-last`           | Default parameters at end of param list  |
| `no-useless-empty-export`      | Remove empty `export {}` statements      |
| `no-loop-func`                 | No function creation inside loops        |
| `return-await`                 | Only `return await` inside try-catch     |

### Warnings

| Rule                           | Description                              |
| ------------------------------ | ---------------------------------------- |
| `consistent-type-imports`      | Use `import type` for type-only imports  |
| `explicit-function-return-type`| All functions must have return types     |
| `prefer-nullish-coalescing`    | Use `??` instead of `\|\|` for nullish   |
| `prefer-optional-chain`        | Use `?.` instead of `&& obj.prop`        |
| `no-shadow`                    | No variable shadowing                    |

---

## 3. Core JavaScript Rules

### Errors

| Rule               | Description                                |
| ------------------ | ------------------------------------------ |
| `no-console`       | Only `console.warn` and `console.error`    |
| `eqeqeq`          | Always use `===` and `!==`                 |
| `no-var`           | Use `const` or `let`, never `var`          |
| `prefer-const`     | Use `const` when variable is not reassigned|
| `no-eval`          | No `eval()` calls                          |
| `no-implied-eval`  | No implied eval (setTimeout with string)   |
| `no-new-func`      | No `new Function()` calls                  |
| `prefer-template`  | Use template literals over concatenation   |
| `no-param-reassign`| No reassigning function parameters         |
| `no-nested-ternary`| No nested ternary expressions              |
| `curly`            | Always use curly braces (all)              |
| `no-else-return`   | No `else` after `return`                   |
| `object-shorthand` | Use shorthand for object methods/properties|
| `no-useless-rename`| No renaming to same name in destructuring  |
| `no-script-url`    | No `javascript:` URLs                     |

---

## 4. React Rules

### Errors

| Rule                                | Description                                      |
| ----------------------------------- | ------------------------------------------------ |
| `jsx-no-target-blank`               | Require `rel="noopener"` with `target="_blank"`  |
| `jsx-boolean-value`                 | Use `<Comp disabled />` not `disabled={true}`    |
| `jsx-curly-brace-presence`          | No braces for string literals in JSX             |
| `self-closing-comp`                 | Use `<Comp />` not `<Comp></Comp>`               |
| `no-danger`                         | No `dangerouslySetInnerHTML`                     |
| `no-unstable-nested-components`     | No component definitions inside render           |
| `jsx-no-useless-fragment`           | No unnecessary `<></>`                           |
| `jsx-no-constructed-context-values` | No inline objects in context providers           |

### React Hooks

| Rule              | Level   | Description                              |
| ----------------- | ------- | ---------------------------------------- |
| `rules-of-hooks`  | Error   | Hooks must follow rules of hooks         |
| `exhaustive-deps` | Warning | All dependencies in useEffect/useMemo/useCallback |

### Accessibility (jsx-a11y)

| Rule                             | Level   | Description                              |
| -------------------------------- | ------- | ---------------------------------------- |
| `alt-text`                       | Error   | Images must have alt text                |
| `anchor-is-valid`                | Error   | Anchors must have valid href             |
| `click-events-have-key-events`   | Warning | Clickable elements need keyboard support |
| `no-static-element-interactions` | Warning | Static elements should not have handlers |
| `label-has-associated-control`   | Warning | Labels must be associated with controls  |

---

## 5. Security Rules

| Rule                                  | Level   | Description                           |
| ------------------------------------- | ------- | ------------------------------------- |
| `detect-eval-with-expression`         | Error   | No eval with dynamic expressions      |
| `detect-no-csrf`                      | Error   | CSRF protection required              |
| `detect-buffer-noassert`              | Error   | No Buffer without assertion            |
| `detect-disable-mustache-escape`      | Error   | No disabling template escaping         |
| `detect-new-buffer`                   | Error   | No deprecated Buffer constructor       |
| `detect-object-injection`             | Warning | Bracket notation access warning        |
| `detect-non-literal-regexp`           | Warning | Non-literal RegExp warning             |
| `detect-non-literal-fs`              | Warning | Non-literal filesystem access          |
| `detect-child-process`               | Warning | Child process usage warning            |
| `detect-pseudoRandomBytes`           | Warning | Use crypto-safe random                 |
| `detect-unsafe-regex`                | Warning | Potentially unsafe regex               |

---

## 6. Unicorn Rules

| Rule                           | Level   | Description                           |
| ------------------------------ | ------- | ------------------------------------- |
| `prefer-node-protocol`        | Error   | Use `node:` protocol for built-ins    |
| `no-nested-ternary`           | Error   | No nested ternary expressions         |
| `prefer-string-slice`         | Error   | Use `.slice()` over `.substr()`       |
| `no-array-for-each`           | Warning | Prefer `for...of` over `.forEach()`  |
| `no-useless-undefined`        | Warning | No explicit `undefined` arguments     |
| `prefer-ternary`              | Warning | Prefer ternary for simple if/else     |
| `prefer-array-find`           | Warning | Use `.find()` over `.filter()[0]`    |
| `prefer-array-some`           | Warning | Use `.some()` over `.filter().length` |
| `prefer-array-includes`       | Warning | Use `.includes()` over `.indexOf()`  |
| `prefer-number-properties`    | Warning | Use `Number.isNaN` over global        |
| `no-lonely-if`                | Warning | No lone `if` inside `else`           |
| `no-array-push-push`          | Warning | Combine push calls                    |
| `prefer-spread`               | Warning | Use spread over `.apply()`           |
| `prefer-string-replace-all`   | Warning | Use `.replaceAll()` over regex        |
| `prefer-at`                   | Warning | Use `.at()` for index access          |

---

## 7. Import Rules

| Rule                    | Level   | Description                           |
| ----------------------- | ------- | ------------------------------------- |
| `no-duplicates`         | Error   | No duplicate import statements         |
| `first`                 | Error   | Imports must be at the top of file     |
| `newline-after-import`  | Error   | Blank line after import block          |
| `no-mutable-exports`    | Error   | No mutable exports                     |
| `no-self-import`        | Error   | No module importing itself             |
| `no-useless-path-segments` | Error| No unnecessary path segments           |

### Import Order (enforced)

Groups are separated by blank lines, alphabetized within groups:

```typescript
// 1. Builtin (node:*)
import { readFile } from 'node:fs';

// 2. External (@tanstack, zod, etc.)
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

// 3. Internal (@/*)
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ChatThread } from '@/types';

// 4. Parent (..)
import { SharedComponent } from '../shared';

// 5. Sibling (.)
import { helper } from './helper';

// 6. Index (./)
import { config } from './';
```

---

## 8. File-Specific Restrictions (no-restricted-syntax)

### TSX Component Files

These AST selectors are banned in `.tsx` files:

| Selector                                     | Message                                              |
| -------------------------------------------- | ---------------------------------------------------- |
| `TSTypeAliasDeclaration`                     | Extract types to `src/types/<domain>.types.ts`       |
| `TSInterfaceDeclaration`                     | Extract interfaces to `src/types/<domain>.types.ts`  |
| `TSEnumDeclaration`                          | Define enums in `src/enums/` only                    |
| `TSUnionType > TSLiteralType`                | Use enums instead of string literal unions           |
| `FunctionDeclaration[id.name=/^use[A-Z]/]`   | Extract hooks to `src/hooks/`                        |
| `VariableDeclarator[id.name=/^use[A-Z]/] > ArrowFunctionExpression` | Extract hooks to `src/hooks/` |
| `VariableDeclarator[id.name=/^[A-Z][A-Z0-9_]+$/]` | Extract SCREAMING_CASE constants to `src/constants/` |
| `ExportNamedDeclaration > FunctionDeclaration[id.name=/^(format\|parse\|transform\|...)/]` | Extract utilities to `src/utilities/` |
| `Program > VariableDeclaration[kind="const"] > VariableDeclarator[init.type!="ArrowFunctionExpression"][init.type!="CallExpression"]` | Extract module-level const to `src/constants/` |
| `Program > FunctionDeclaration:not([id.name=/^[A-Z]/])` | Only PascalCase component functions allowed inline |

### Hook and Store Files

| Banned                        | Must Extract To         |
| ----------------------------- | ----------------------- |
| Inline types/interfaces       | `src/types/`            |
| Inline enums                  | `src/enums/`            |
| Inline constants (non-object) | `src/constants/`        |
| Helper functions              | `src/utilities/`        |

### Service Files

| Banned                | Must Extract To         |
| --------------------- | ----------------------- |
| Inline types/enums    | `src/types/`, `src/enums/` |
| Inline constants      | `src/constants/`        |

### Exemptions

| File Pattern              | Restrictions                          |
| ------------------------- | ------------------------------------- |
| `src/components/ui/*`     | All restrictions OFF (auto-generated) |
| `*.test.ts`, `*.test.tsx` | All restrictions OFF, `any` allowed   |

---

## 9. Running ESLint

```bash
# Lint all workspaces
npm run lint

# Lint frontend only
npm run lint --workspace=apps/claw-frontend

# Lint with strict (zero warnings)
cd apps/claw-frontend && npm run lint:strict

# Auto-fix
cd apps/claw-frontend && npm run lint:fix
```
