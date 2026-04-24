# Routing Database Schema (claw_routing)

PostgreSQL database for the routing service (port 5444). Stores routing decisions, policies, execution outcomes, feedback-linked education records, and learned calibration snapshots.

---

## Connection

```
Database: claw_routing
Port: 5444 (host) / 5432 (container)
URL: postgresql://claw:claw_secret@pg-routing:5432/claw_routing?schema=public
Prisma schema: apps/claw-routing-service/prisma/schema.prisma
```

---

## Tables

### routing_decisions

Records every routing decision made for each message.

| Column                    | Type             | Nullable | Default  | Constraints | Description                                       |
| ------------------------- | ---------------- | -------- | -------- | ----------- | ------------------------------------------------- |
| id                        | String (CUID)    | NO       | `cuid()` | PK          | Decision identifier                               |
| message_id                | String           | YES      | -        | -           | Originating message ID                            |
| thread_id                 | String           | NO       | -        | -           | Thread the message belongs to                     |
| selected_provider         | String           | NO       | -        | -           | Chosen provider (e.g., "anthropic")               |
| selected_model            | String           | NO       | -        | -           | Chosen model (e.g., "claude-sonnet-4")            |
| routing_mode              | RoutingMode enum | NO       | -        | -           | Mode used for decision                            |
| confidence                | Decimal(5,4)     | YES      | -        | -           | Router confidence (0.0000-1.0000)                 |
| reason_tags               | String[]         | NO       | -        | -           | Reason codes (e.g., ["coding", "complex"])        |
| privacy_class             | String           | YES      | -        | -           | Privacy classification (e.g., "local", "cloud")   |
| cost_class                | String           | YES      | -        | -           | Cost classification (e.g., "free", "low", "high") |
| fallback_provider         | String           | YES      | -        | -           | Fallback provider if primary fails                |
| fallback_model            | String           | YES      | -        | -           | Fallback model if primary fails                   |
| detected_category         | String           | YES      | -        | -           | Primary detected task family                      |
| secondary_category        | String           | YES      | -        | -           | Secondary detected task family                    |
| match_count               | Int              | YES      | -        | -           | Number of matched routing signals                 |
| selected_execution_path   | String           | YES      | -        | -           | Selected execution strategy path                  |
| route_roadmap             | Json             | YES      | -        | -           | Structured roadmap and fallback metadata          |
| model_inventory_snapshot  | Json             | YES      | -        | -           | Installed model snapshot used during routing      |
| connector_health_snapshot | Json             | YES      | -        | -           | Health snapshot used during routing               |
| capability_match_score    | Decimal(5,4)     | YES      | -        | -           | Capability fit score                              |
| latency_score             | Decimal(5,4)     | YES      | -        | -           | Latency fit score                                 |
| risk_score                | Decimal(5,4)     | YES      | -        | -           | Learned risk score                                |
| uncertainty_score         | Decimal(5,4)     | YES      | -        | -           | Learned uncertainty score                         |
| created_at                | DateTime         | NO       | `now()`  | -           | Decision timestamp                                |

**Indexes**:

- `message_id` — find decision for a message
- `thread_id` — list decisions for a thread
- `routing_mode` — filter by mode
- `created_at` — sort chronologically

### routing_policies

Configurable policies that can override or influence routing decisions.

| Column       | Type             | Nullable | Default  | Constraints | Description                             |
| ------------ | ---------------- | -------- | -------- | ----------- | --------------------------------------- |
| id           | String (CUID)    | NO       | `cuid()` | PK          | Policy identifier                       |
| name         | String           | NO       | -        | -           | Policy display name                     |
| routing_mode | RoutingMode enum | NO       | -        | -           | Mode this policy applies to             |
| priority     | Int              | NO       | `0`      | -           | Priority order (higher = applied first) |
| is_active    | Boolean          | NO       | `true`   | -           | Whether policy is active                |
| config       | Json             | NO       | -        | -           | Policy configuration (varies by mode)   |
| created_at   | DateTime         | NO       | `now()`  | -           | Creation timestamp                      |
| updated_at   | DateTime         | NO       | auto     | -           | Last update timestamp                   |

**Indexes**:

- `routing_mode` — find policies for a mode
- `is_active` — filter active policies
- `priority` — sort by priority

### routing_outcome_records

Execution outcomes attached to routing decisions.

Key fields:

- `routing_decision_id`
- `message_id`
- `assistant_message_id`
- `thread_id`
- `final_execution_provider`
- `final_execution_model`
- `execution_status`
- `execution_success`
- `actual_latency_ms`
- `actual_cost_estimate`
- `fallback_used`
- `judge_outcome`
- `judge_confidence`
- `critic_score`
- `issue_tags`
- `revised`
- `escalated`

### routing_feedback_records

Thumbs-derived learning records associated with routed answers.

Key fields:

- `routing_decision_id`
- `message_id`
- `assistant_message_id`
- `thread_id`
- `feedback_value`
- `source`
- `weight`
- `task_family`

### router_model_profiles

Materialized learned model performance profiles.

### router_topic_profiles

Materialized learned topic aggregates across models.

### routing_calibration_snapshots

Versioned prompt-consumable snapshots of the current education state.

---

## Enums

### RoutingMode

```
AUTO           — Dynamic: Ollama router + category detection + heuristic fallback
MANUAL_MODEL   — User-selected provider + model
LOCAL_ONLY     — Category-aware local model selection
PRIVACY_FIRST  — Local if healthy, else Anthropic
LOW_LATENCY    — OpenAI gpt-4o-mini
HIGH_REASONING — Anthropic claude-opus-4
COST_SAVER     — Local if healthy, else cheapest cloud
```

### FeedbackValue

```
POSITIVE
NEGATIVE
```

### RoutingExecutionStatus

```
SUCCEEDED
FAILED
DEGRADED
NO_EXECUTION_MODEL
```

### JudgeOutcome

```
VERIFIED
REVISED
ESCALATED
UNAVAILABLE
NONE
```

---

## Policy Config Examples

### AUTO mode policy

```json
{
  "preferredProvider": "anthropic",
  "codingModel": "claude-sonnet-4",
  "reasoningModel": "claude-opus-4",
  "enableFallback": true
}
```

### COST_SAVER policy

```json
{
  "maxCostPerMessage": 0.01,
  "preferLocal": true,
  "cloudFallback": "deepseek"
}
```

---

## Data Flow

1. `message.created` event received from chat-service
2. Routing manager evaluates: check policies -> detect category -> call Ollama or heuristic
3. Decision stored in `routing_decisions` table
4. `message.routed` event published with selectedProvider/Model
5. Decision also published as `routing.decision_made` for audit
6. `message.completed` later materializes an outcome row
7. `message.feedback_set` later materializes a feedback row
8. Aggregates are recomputed into profiles and a calibration snapshot

---

## Query Patterns

```sql
-- Recent decisions for a thread (transparency panel)
SELECT * FROM routing_decisions
WHERE thread_id = ? ORDER BY created_at DESC LIMIT 20;

-- Active policies sorted by priority
SELECT * FROM routing_policies
WHERE is_active = true ORDER BY priority DESC;

-- Routing mode distribution
SELECT routing_mode, COUNT(*) FROM routing_decisions
GROUP BY routing_mode;
```
