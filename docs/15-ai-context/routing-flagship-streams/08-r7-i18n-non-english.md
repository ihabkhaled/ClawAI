# Stream 08 — R.7 i18n Non-English Routing

**Source prompt:** `plan-prompts/ClawAI_routing_implementation_flagship_pack/08_R7_i18n_non_english_routing.md`

## Mission

Stop treating every message as English. Detect language; route to language-aware models; expand keyword arrays for top non-EN languages; track language confidence on every decision.

## Files to add (scaffold included)

```
apps/claw-routing-service/src/modules/language-detection/    (NEW MODULE)
├── language-detection.module.ts
├── controllers/
│   └── language-detection.controller.ts                     (POST /routing/detect-language)
├── services/
│   └── language-detection.service.ts
├── managers/
│   ├── language-classifier.manager.ts                       (uses cld3 or fastext-lite)
│   └── code-mixed-detector.manager.ts                       (e.g. Arabic + English technical terms)
├── dto/
│   └── detect-language.dto.ts
├── types/
│   └── language-detection.types.ts
├── constants/
│   ├── language-codes.constants.ts                          (ISO-639-1 supported set)
│   └── language-rtl.constants.ts                            (which languages are RTL)
└── utilities/
    └── language-strength-resolver.utility.ts                (reads RouterModelRegistry.languageStrengthJson)
```

## Schema changes (see PRISMA_FUTURE_MODELS.md)

- `RoutingDecision`: add `detectedLanguage`, `languageConfidence`, `isCodeMixed`
- `RouterModelRegistry`: add `languageStrengthJson` (per-language quality score)

## Detection pipeline

```
1. Run cld3 (Compact Language Detector) on message → top-1 language + confidence
2. If confidence < 0.6 → tag as 'uncertain', use 'en' as fallback
3. If multi-language (e.g. "كود في Python" Arabic+English) → flag isCodeMixed
4. Save to RoutingDecision.detectedLanguage + languageConfidence
5. Pass language to scoring engine → boost candidates with high languageStrength
6. If RTL language (ar/he/fa/ur) and ROUTING_R7_ARABIC_RTL_HINT_ENABLED → prepend "respond in RTL-friendly format" to system prompt
```

## Translated keyword arrays

Initial scope: Arabic, Spanish, German (top 3 non-EN per audit user demographics).

```
apps/claw-routing-service/src/modules/routing/constants/locale-keywords/
├── ar/coding-keywords.constants.ts             ('كود', 'برمجة', 'وظيفة')
├── ar/legal-keywords.constants.ts              ('قانون', 'محام', 'عقد')
├── ar/medical-keywords.constants.ts            ('طب', 'تشخيص', 'دواء')
├── es/coding-keywords.constants.ts             ('código', 'programación', 'función')
├── es/legal-keywords.constants.ts              ('legal', 'abogado', 'contrato')
├── es/medical-keywords.constants.ts            ('médico', 'diagnóstico', 'medicamento')
├── de/coding-keywords.constants.ts             ('Code', 'Programmierung', 'Funktion')
├── de/legal-keywords.constants.ts              ('Recht', 'Anwalt', 'Vertrag')
└── de/medical-keywords.constants.ts            ('Medizin', 'Diagnose', 'Medikament')
```

Activation: `ROUTING_R7_SUPPORTED_LOCALES=en,ar,es,de` (extend per release).

Roadmap: fr, hi, it, pt, ru, hi, ja, zh-cn (post-stream).

## Acceptance criteria

| #   | Test                                                        | Expected                                                             |
| --- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | Arabic message "كود تصنيف صور"                              | `detectedLanguage=ar`, classified as Coding via AR keywords          |
| 2   | Spanish "Necesito un médico"                                | `detectedLanguage=es`, classified as Medical via ES keywords         |
| 3   | German "Wie funktioniert dieses Gesetz?"                    | `detectedLanguage=de`, classified as Legal via DE keywords           |
| 4   | Code-mixed "Write me a 'دالة' in Python"                    | `isCodeMixed=true`, primary lang detected, both keyword sets scanned |
| 5   | Arabic + routing prefers `claude-opus-4` (high AR strength) | candidate score boosted; opus wins over gemini-flash                 |
| 6   | RTL message → response system prompt includes RTL hint      | when flag enabled                                                    |
| 7   | Language confidence < 0.6                                   | falls through to EN keywords; tag `language_uncertain`               |
| 8   | Unsupported locale (e.g. hi for now)                        | detected + saved + classifier falls back to EN                       |
| 9   | Performance: detection adds <10ms                           | cld3 is fast; measure p95                                            |

## Endpoint contract

```http
POST /api/v1/routing/detect-language
{ "message": "مرحبا، كيف يمكنني كتابة دالة Python؟" }

200:
{
  "detectedLanguage": "ar",
  "languageConfidence": 0.97,
  "isCodeMixed": true,
  "secondaryLanguage": "en",
  "secondaryConfidence": 0.12,
  "isRtl": true
}
```

## RouterModelRegistry language strength seed

```typescript
{
  'claude-opus-4':       { en: 1.0, ar: 0.92, es: 0.95, de: 0.94, fr: 0.94, hi: 0.85, ja: 0.88, zh: 0.85 },
  'claude-sonnet-4':     { en: 1.0, ar: 0.88, es: 0.93, de: 0.92, fr: 0.92, hi: 0.78, ja: 0.85, zh: 0.82 },
  'gpt-4o':              { en: 1.0, ar: 0.85, es: 0.95, de: 0.94, fr: 0.94, hi: 0.82, ja: 0.92, zh: 0.92 },
  'gpt-4o-mini':         { en: 1.0, ar: 0.70, es: 0.90, de: 0.88, fr: 0.88, hi: 0.65, ja: 0.80, zh: 0.78 },
  'gemini-2.5-flash':    { en: 1.0, ar: 0.78, es: 0.92, de: 0.90, fr: 0.90, hi: 0.80, ja: 0.88, zh: 0.85 },
  'gemma3:4b':           { en: 0.95, ar: 0.65, es: 0.78, de: 0.75, fr: 0.78 },
  'qwen3:1.7b':          { en: 0.92, ar: 0.55, es: 0.70, de: 0.68, fr: 0.70, ja: 0.80, zh: 0.95 },
  'phi4-mini':           { en: 0.95, ar: 0.50, es: 0.72, de: 0.70, fr: 0.72 },
}
```

Seeded via `apps/claw-routing-service/prisma/seed/language-strength.seed.ts`.

## Tests

```
apps/claw-routing-service/src/modules/language-detection/managers/__tests__/language-classifier.manager.spec.ts
  - 9 languages detected correctly with confidence > 0.8
  - code-mixed detected
  - very short message (1 word) returns 'en' fallback
  - empty message returns null

qa/test-routing-r7-language-detection.sh
  - 20 prompts in 9 languages, assert detection correct
  - assert routing biases toward stronger-language models
```

## Rollback

`ROUTING_R7_LANGUAGE_DETECTION_ENABLED=false` → endpoint returns null; hot path skips detection; `detectedLanguage` left null on new decisions.
