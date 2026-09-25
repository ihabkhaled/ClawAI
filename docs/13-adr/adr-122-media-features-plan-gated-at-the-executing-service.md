# ADR-122 — Media features are plan-gated server-side at the executing service

## Status

Accepted — 2026-09-25, batch 6 of
[`docs/implementation/multimodal-orchestration-plan.md`](../implementation/multimodal-orchestration-plan.md).

## Context

The owner decided the media split on 2026-09-25: **Free keeps the basics**
(image understanding, voice notes, short video); **paid plans get everything**
(image generation and edit, long video, helper vision, text-to-speech). Until
now every plan could generate images, and helper vision (ADR-120 batch 5) ran
for anyone whose chat model could not see.

Media work is executed by more than one service and reached by more than one
path: image generation from chat's internal call, from `POST /images/:id/retry`
and `/retry-alternate`, and from the auto-fallback chain; helper vision inside
every compare lane, judge and critic.

## Decision

1. **Four plan fields**, modelled exactly like `allowCompareMode`: Prisma
   `Plan` columns + migration `20260925200000_add_media_plan_gates`,
   `plan-catalog.json` `media` block, admin plan editor, `PlanFeatureGates` /
   `limits` in `@claw/shared-entitlements`, auth's entitlements payload.
   - `allowImageGeneration`, `allowHelperVision`, `allowTextToSpeech` —
     `Boolean DEFAULT false` (opt-in, like every gate).
   - `maxVideoSeconds Int? DEFAULT 60` — `null` unlimited, `0` disabled. The
     default is the FREE allowance so no row can land on an accidental null.
2. **Values:** `free` (and a legacy `trial` row) — all three off, 60 s.
   `starter`, `plus`, `pro`, `team`, `scale`, `unlimited` — all on, 600 s. The
   migration sets existing rows by slug; admin-created custom plans keep the
   free defaults until an operator opts them in (a price is not a media
   decision). Trials resolve to the plan they trial, so they inherit its gates.
3. **The executing service enforces.** image-service's `ImagePlanGateManager`
   runs first in `enqueueGeneration`, `retryGeneration` and
   `retryWithAlternateModel` (the owner-checked public variants call these), so
   a refused user leaves no row, no PAYG hold and no provider call.
   `403 PLAN_FEATURE_DISABLED` — the same code, status and message chat-service
   uses. chat-service `VisionHelperManager` asks
   `AccessControlService.hasPlanFeatureFor(userId, 'allowHelperVision')` only
   when an image is actually blind, and on "no" keeps OCR + the honest note with
   reason `file_delivery.reason.helper_vision_plan`. TTS and video enforce their
   gates in their own batches (9 and 7/8).
4. **Chat renders a refusal, not an error.** Before the vision prompt hop and
   before image-service, `callImageService` asks the plan; on "no" (or on
   image-service's own 403) it returns a finished reply with
   `planFeatureRefusal`, persisted as `metadata.type = 'plan_feature_disabled'`
   - `planFeature`. The frontend `PlanFeatureNotice` translates it in 13
     locales with an upgrade link.
5. **Fail closed.** The chat-service plan-feature convention: an unresolvable
   entitlement unlocks nothing paid. image-service answers `503
ENTITLEMENTS_UNAVAILABLE` (a stated `PLAN_TRIAL_EXPIRED` keeps its code);
   chat's image turn surfaces the same 503; helper vision falls back to the free
   path WITHOUT the plan reason (an outage is not the plan) and never breaks
   the turn.
6. **ADMIN bypasses** through `hasPlanFeature`, and the admin entitlement plan
   carries every media gate on and `maxVideoSeconds: null`.

## Consequences

- A free user who asks for a picture gets a translated "Unlock Image
  generation" notice and spends nothing — not even the vision prompt hop.
- A plan downgrade takes effect on the next generation, including a retry of
  a job created while the plan still allowed it.
- During a rolling deploy, an old auth-service omits the new gates, so
  `hasPlanFeature` reads them as false: paid users are refused image generation
  until auth-service is updated. **Deploy auth-service first.**
- Custom plans created before this migration default to free media; an
  operator must switch them on in the admin plan editor.
- `maxVideoSeconds` is exposed now; its enforcement lands with the video
  batches. Unlimited stays at 600 s deliberately: video processing (ffmpeg
  CPU) is not PAYG-metered, so no tier is uncapped until that is priced.
