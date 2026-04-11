# ADR-004: Zod Over class-validator

## Status

Accepted (2025-Q1)

## Context

NestJS traditionally uses `class-validator` and `class-transformer` for DTO validation. This approach relies on decorators on class properties and a global `ValidationPipe` to transform and validate incoming request bodies.

While functional, this approach has several pain points:

- **No type inference**: The class defines runtime validation, but the TypeScript type must be maintained separately or inferred via workarounds.
- **Decorator soup**: Complex validation rules (conditional, nested, custom) produce hard-to-read classes with stacked decorators.
- **No composability**: Reusing partial schemas (e.g., pagination params across multiple DTOs) requires class inheritance, which is fragile.
- **Frontend gap**: `class-validator` is backend-only. The frontend needs a separate validation library, leading to duplicated rules.

## Decision

Use Zod for all DTO validation across both backend and frontend. Each DTO file exports both the Zod schema and the inferred TypeScript type.

```typescript
// Example: src/modules/chat/dto/create-thread.dto.ts
export const createThreadSchema = z.object({
  title: z.string().min(1).max(200),
  routingMode: z.nativeEnum(RoutingMode),
  systemPrompt: z.string().max(4000).optional(),
});

export type CreateThreadDto = z.infer<typeof createThreadSchema>;
```

### Validation Rules

- Every `z.string()` must have `.max()` for length limits
- Every `z.array()` must have `.max()` for size limits
- Zod schemas live in `src/modules/<domain>/dto/<name>.dto.ts`
- Backend uses a custom `ZodValidationPipe` to integrate with NestJS
- Frontend reuses the same schema patterns for form validation

## Consequences

### Positive

- **Single source of truth**: The Zod schema defines both the runtime validation and the TypeScript type. No drift between them.
- **Composability**: Schemas can be composed with `.merge()`, `.pick()`, `.omit()`, `.extend()`, and `.partial()`.
- **Type inference**: `z.infer<typeof schema>` produces the exact TypeScript type. No manual type maintenance.
- **Frontend/backend consistency**: Both sides use Zod, ensuring identical validation rules.
- **Better error messages**: Zod's error formatting is more structured and easier to present to users.
- **Transforms**: `.transform()` and `.preprocess()` handle coercion (e.g., string to number for query params) cleanly.

### Negative

- **Non-standard for NestJS**: Most NestJS tutorials and examples use `class-validator`. New team members may need onboarding.
- **Custom pipe required**: NestJS's built-in `ValidationPipe` does not understand Zod. A custom `ZodValidationPipe` is needed.
- **No decorator metadata**: Some NestJS features (e.g., Swagger generation) rely on class-validator metadata. Zod requires manual OpenAPI schema definition if Swagger is needed.

## Alternatives Considered

### class-validator + class-transformer

The NestJS default. Mature, well-documented, works with Swagger out of the box. Rejected due to lack of type inference, poor composability, and inability to share schemas with the frontend.

### Joi

Mature schema validation library with a similar API to Zod. However, Joi's TypeScript support is weaker (no `z.infer` equivalent), and its bundle size is larger. Rejected in favor of Zod's superior TypeScript integration.

### Yup

Popular in the React ecosystem (Formik). Similar to Zod but with weaker TypeScript inference and no `.transform()` support at the time of evaluation. Rejected for the same reasons as Joi.

### Valibot

Smaller bundle size than Zod with a similar API. However, Valibot was too new at the time of decision (limited ecosystem, fewer examples). Could revisit if bundle size becomes a concern for the frontend.
