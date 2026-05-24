# Prisma — Future Models (scaffolded, not yet applied)

These models are scaffolded by the flagship pack but **NOT yet present in `schema.prisma`**. Add via migration when activating the relevant stream.

---

## R.4 — Cost budget (Stream 05)

```prisma
enum CostBudgetScope {
  USER
  ORG
}

enum CostBudgetStatus {
  OK
  WARN
  EXCEEDED
}

model UserCostBudget {
  id                String           @id @default(cuid())
  scope             CostBudgetScope
  ownerId           String           @map("owner_id")      // userId or orgId
  monthlyCapUsd     Decimal          @map("monthly_cap_usd") @db.Decimal(12, 4)
  currentSpendUsd   Decimal          @default(0) @map("current_spend_usd") @db.Decimal(12, 4)
  status            CostBudgetStatus @default(OK)
  warnAtPercent     Int              @default(80) @map("warn_at_percent")
  overrideAllowed   Boolean          @default(false) @map("override_allowed")
  resetAt           DateTime         @map("reset_at")
  lastWarningSentAt DateTime?        @map("last_warning_sent_at")
  createdAt         DateTime         @default(now()) @map("created_at")
  updatedAt         DateTime         @updatedAt @map("updated_at")

  @@unique([scope, ownerId])
  @@index([status])
  @@index([resetAt])
  @@map("user_cost_budgets")
}
```

**Backfill:** none — empty table on activation. First budget check returns OK if no row exists.

---

## R.6 — Multi-tenant fleet (Stream 07)

```prisma
// Modify existing RoutingPolicy: add orgId column.

model RoutingPolicy {
  id          String      @id @default(cuid())
  name        String
  routingMode RoutingMode @map("routing_mode")
  priority    Int         @default(0)
  isActive    Boolean     @default(true) @map("is_active")
  config      Json
  orgId       String?     @map("org_id")  // NEW — null = global policy
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  @@index([routingMode])
  @@index([isActive])
  @@index([priority])
  @@index([orgId, isActive, priority])  // NEW
  @@map("routing_policies")
}

// NEW table for org-scoped allow/deny lists

enum OrgProviderRuleKind {
  ALLOW
  DENY
}

model OrgProviderRule {
  id        String              @id @default(cuid())
  orgId     String              @map("org_id")
  provider  String
  kind      OrgProviderRuleKind
  reason    String?
  createdAt DateTime            @default(now()) @map("created_at")

  @@unique([orgId, provider])
  @@index([orgId, kind])
  @@map("org_provider_rules")
}

// NEW table for org rate limits

model OrgRateLimit {
  id                  String   @id @default(cuid())
  orgId               String   @unique @map("org_id")
  requestsPerMinute   Int      @map("requests_per_minute")
  burst               Int      @default(0)
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  @@map("org_rate_limits")
}
```

**Backfill:** `UPDATE routing_policies SET org_id = NULL;` (already null on creation — preserves existing policies as global).

---

## R.7 — Language detection (Stream 08)

```prisma
// Modify existing RoutingDecision: add language columns.

model RoutingDecision {
  // ... existing fields
  detectedLanguage    String?  @map("detected_language")     // ISO-639-1 (e.g. 'en', 'ar', 'es')
  languageConfidence  Decimal? @map("language_confidence") @db.Decimal(5, 4)
  isCodeMixed         Boolean  @default(false) @map("is_code_mixed")
  // ... existing fields
}

// Extend RouterModelRegistry with per-language strength.

model RouterModelRegistry {
  // ... existing fields
  languageStrengthJson Json?  @map("language_strength_json")
  // Shape: { "en": 1.0, "ar": 0.85, "es": 0.9, ... }
  // ... existing fields
}
```

**Backfill:** none. Existing decisions remain `detectedLanguage=NULL`.

---

## R.2/R.3 — Modality + workflow on RoutingDecision (Streams 03, 04)

```prisma
// Modify existing RoutingDecision: add modality + workflow columns.

model RoutingDecision {
  // ... existing fields
  detectedModalities  Json?           @map("detected_modalities")
  // Shape: ["TEXT", "PDF_INPUT", "YOUTUBE_INPUT"]
  selectedWorkflow    WorkflowKind?   @map("selected_workflow")
  workflowConfidence  Decimal?        @map("workflow_confidence") @db.Decimal(5, 4)
  // ... existing fields
}
```

**Backfill:** none.

---

## R.8 — Advanced intelligence (Stream 09 — one sub-feature per migration)

### 09.1 Prompt-length filtering — no new model, uses RouterModelRegistry.contextWindowTokens (already exists)

### 09.2 Latency circuit breaker — extends existing RouterCircuitBreaker

```prisma
model RouterCircuitBreaker {
  // ... existing fields
  trigger              String   @default("FAILURE_RATE")  // 'FAILURE_RATE' | 'LATENCY_P95'
  latencyThresholdMs   Int?     @map("latency_threshold_ms")
  // ... existing fields
}
```

### 09.4 Fine-tuned model preference

```prisma
model UserFineTunePreference {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  domain    DomainTag
  provider  String
  model     String
  weight    Decimal  @default(0.5) @map("weight") @db.Decimal(3, 2)
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([userId, domain])
  @@index([userId])
  @@map("user_fine_tune_preferences")
}
```

### 09.5 Region preference

```prisma
model RouterRegionPreference {
  id            String   @id @default(cuid())
  scope         String   // 'USER' | 'ORG' | 'GLOBAL'
  ownerId       String?  @map("owner_id")
  provider      String
  preferredRegion String @map("preferred_region")
  reason        String?  // 'GDPR' | 'LATENCY' | 'COST'
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([scope, ownerId, provider])
  @@map("router_region_preferences")
}
```

### 09.9 Cost/quality slider

```prisma
model UserCostQualitySlider {
  userId             String   @id @map("user_id")
  qualityWeight      Decimal  @default(0.5) @map("quality_weight") @db.Decimal(3, 2)  // 0 = cheapest, 1 = best
  updatedAt          DateTime @updatedAt @map("updated_at")

  @@map("user_cost_quality_sliders")
}
```

---

## Apply order

When activating a stream, run migrations in this order to avoid FK conflicts:

```bash
# R.4
npx prisma migrate dev --name r4_add_user_cost_budget

# R.6
npx prisma migrate dev --name r6_add_org_id_to_routing_policy
npx prisma migrate dev --name r6_add_org_provider_rules_and_rate_limit

# R.7
npx prisma migrate dev --name r7_add_language_to_routing_decision
npx prisma migrate dev --name r7_add_language_strength_to_model_registry

# R.2/R.3
npx prisma migrate dev --name r2_r3_add_modality_workflow_to_decision

# R.8 (per sub-feature)
npx prisma migrate dev --name r8_2_extend_circuit_breaker_latency
npx prisma migrate dev --name r8_4_add_user_fine_tune_preference
npx prisma migrate dev --name r8_5_add_router_region_preference
npx prisma migrate dev --name r8_9_add_user_cost_quality_slider
```

All migrations are **additive** — no destructive changes, all new columns nullable or have defaults.
