# Form Patterns

> Zod validation, shadcn/ui form components, form hooks, and error display.

---

## 1. Form Architecture

Forms in ClawAI follow the same layered architecture as all other features:

```
Page (TSX) -- renders form component
  --> Controller Hook -- composes form state + mutation hooks
        --> Form State Hook -- manages field values, validation
        --> Mutation Hook -- handles submission via useMutation
        --> Zod Schema -- validates input before submission
```

---

## 2. Zod Validation Schemas

All form validation uses Zod schemas defined in `src/lib/validation/<name>.schema.ts`:

### Available Schemas

| Schema File                  | Purpose                              |
| ---------------------------- | ------------------------------------ |
| `login.schema.ts`            | Login form (email, password)         |
| `change-password.schema.ts`  | Password change form                 |
| `connector.schema.ts`        | Connector create/edit form           |
| `context-pack.schema.ts`     | Context pack form                    |
| `file.schema.ts`             | File upload validation               |
| `memory.schema.ts`           | Memory record form                   |
| `message.schema.ts`          | Message composer validation          |
| `ollama.schema.ts`           | Model pull/role assignment forms     |
| `routing.schema.ts`          | Routing policy form                  |
| `thread.schema.ts`           | Thread settings form                 |

### Schema Pattern

```typescript
// src/lib/validation/login.schema.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
```

### Schema Rules

1. Every `z.string()` MUST have `.max()` for length limits
2. Every `z.array()` MUST have `.max()` for size limits
3. Always export both the schema and the inferred type
4. Use descriptive error messages (these are user-facing)
5. Schemas go in `src/lib/validation/`, NOT inline in components or hooks

### Common Schema Patterns

```typescript
// Required string with length limits
z.string().min(1, 'Name is required').max(255, 'Name is too long')

// Optional string with max
z.string().max(1000, 'Description is too long').optional()

// Enum validation
z.nativeEnum(RoutingMode)

// Number with range
z.number().min(0).max(2).step(0.1)  // temperature 0-2

// Array with limits
z.array(z.string()).max(10, 'Maximum 10 items')

// Conditional validation
z.object({
  provider: z.nativeEnum(ConnectorProvider),
  apiKey: z.string().min(1).optional(),
}).refine(
  (data) => data.provider !== ConnectorProvider.OPENAI || data.apiKey,
  { message: 'API key is required for OpenAI', path: ['apiKey'] },
)
```

---

## 3. Form State Hooks

Form state is managed in dedicated state hooks:

```typescript
// src/hooks/connectors/use-connector-form-state.ts
export function useConnectorFormState(initialValues?: ConnectorFormValues) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [provider, setProvider] = useState(initialValues?.provider ?? ConnectorProvider.OPENAI);
  const [apiKey, setApiKey] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const result = connectorSchema.safeParse({ name, provider, apiKey });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  }, [name, provider, apiKey]);

  const reset = useCallback((): void => {
    setName('');
    setProvider(ConnectorProvider.OPENAI);
    setApiKey('');
    setErrors({});
  }, []);

  return {
    name, setName,
    provider, setProvider,
    apiKey, setApiKey,
    errors,
    validate,
    reset,
  };
}
```

### Form State Hook Rules

- One hook per form
- Manages field values, validation errors, and reset
- Validation uses `schema.safeParse()` (not `parse()`) to capture errors without throwing
- Named `use-<feature>-form-state.ts`
- Types and constants extracted to their dedicated files

---

## 4. Form Components

### Using shadcn/ui Form Controls

All form inputs MUST use shadcn/ui components:

```tsx
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
```

### Form Field Pattern

```tsx
<div className="grid gap-2">
  <Label htmlFor="name">{t('connectors.name')}</Label>
  <Input
    id="name"
    value={formState.name}
    onChange={(e) => formState.setName(e.target.value)}
    placeholder={t('connectors.namePlaceholder')}
  />
  {formState.errors.name && (
    <p className="text-sm text-destructive">{formState.errors.name}</p>
  )}
</div>
```

### Select Field Pattern

```tsx
<div className="grid gap-2">
  <Label>{t('connectors.provider')}</Label>
  <Select value={formState.provider} onValueChange={formState.setProvider}>
    <SelectTrigger>
      <SelectValue placeholder={t('connectors.selectProvider')} />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value={ConnectorProvider.OPENAI}>OpenAI</SelectItem>
      <SelectItem value={ConnectorProvider.ANTHROPIC}>Anthropic</SelectItem>
      <SelectItem value={ConnectorProvider.GOOGLE}>Google</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### Textarea Pattern

```tsx
<div className="grid gap-2">
  <Label>{t('chat.systemPrompt')}</Label>
  <Textarea
    value={formState.systemPrompt}
    onChange={(e) => formState.setSystemPrompt(e.target.value)}
    rows={4}
    placeholder={t('chat.systemPromptPlaceholder')}
  />
</div>
```

---

## 5. Form Submission Pattern

```tsx
function ConnectorForm({ onSubmit, formState, isPending }: ConnectorFormProps): ReactElement {
  const { t } = useTranslation();

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    if (formState.validate()) {
      onSubmit({
        name: formState.name,
        provider: formState.provider,
        apiKey: formState.apiKey,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {/* Form fields */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={formState.reset}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? t('common.loading') : t('common.save')}
        </Button>
      </div>
    </form>
  );
}
```

---

## 6. Form in Dialog Pattern

Forms are often displayed in modal dialogs:

```tsx
function CreateConnectorDialog({ open, onOpenChange }: DialogProps): ReactElement {
  const formState = useConnectorFormState();
  const { createConnector, isPending } = useCreateConnector();

  const handleCreate = (values: ConnectorFormValues): void => {
    createConnector(values, {
      onSuccess: () => {
        formState.reset();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('connectors.create')}</DialogTitle>
        </DialogHeader>
        <ConnectorForm
          onSubmit={handleCreate}
          formState={formState}
          isPending={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
```

---

## 7. Error Display Patterns

### Field-Level Errors

Display directly below the input field:

```tsx
{errors.fieldName && (
  <p className="text-sm text-destructive">{errors.fieldName}</p>
)}
```

### Form-Level Errors

Display at the top or bottom of the form:

```tsx
{submitError && (
  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
    {submitError}
  </div>
)}
```

### API Error Handling

Mutation errors are displayed via toast notifications:

```typescript
onError: (error: Error) => {
  showToast.apiError(error, t('connectors.createFailed'));
},
```

---

## 8. Validation Tests

Every Zod schema has corresponding tests in `src/lib/validation/__tests__/`:

```typescript
// src/lib/validation/__tests__/login.schema.test.ts
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
  });

  it('should reject empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});
```
