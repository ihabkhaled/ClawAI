---
name: verify-multimodal-routing-live
summary: Prove the multimodal program works on a running stack — run qa/test-multimodal.sh (image/helper vision, metered voice transcription, video job + frames/native delivery, chat image generation by plan, IDOR + SSE regressions, TTS replay, upload rejections, log lines) and print the per-model capability matrix from live connector + routing data.
task_keywords:
  [
    multimodal qa,
    test-multimodal,
    capability matrix,
    helper vision live,
    DERIVED_IMAGE_TEXT,
    OMITTED_NO_VISION,
    VIDEO_FRAMES_AND_TRANSCRIPT,
    NATIVE_VIDEO,
    transcription ledger,
    read aloud,
    TTS replay,
    PLAN_FEATURE_DISABLED,
    image generation plan gate,
  ]
applies_to:
  [
    apps/claw-chat-service,
    apps/claw-file-service,
    apps/claw-image-service,
    apps/claw-routing-service,
    apps/claw-connector-service,
    apps/claw-auth-service,
  ]
required_rules:
  [
    44-live-verification-before-done,
    49-qa-team-discipline-and-test-evidence,
    54-evidence-and-completion-honesty,
    42-attachment-understanding,
    37-payg-credit-integrity,
  ]
required_context: [testing-map, service-catalog]
affected_workspaces: [tools]
required_tests: [multimodal-capability-matrix.test]
required_docs: [docs/implementation/multimodal-orchestration-plan.md]
validation_lane: bash -n qa/test-multimodal.sh && node --test tools/__tests__/multimodal-capability-matrix.test.mjs
---

# Verify multimodal routing live

The API lane for the multimodal orchestration program
([plan](../docs/implementation/multimodal-orchestration-plan.md) ·
[ADR-120](../docs/13-adr/adr-120-clawai-owns-multimodal-orchestration.md) ·
[ADR-122](../docs/13-adr/adr-122-media-features-plan-gated-at-the-executing-service.md)).
It is the rule [44](../rules/44-live-verification-before-done.md) /
[49](../rules/49-qa-team-discipline-and-test-evidence.md) evidence for batches
1–10b. It does **not** replace the browser lane or the device matrix
([run-the-qa-team.md](./run-the-qa-team.md)).

## 0. Is the stack running THIS code?

Dev containers run `tsgo --watch` over the **main checkout's** bind-mounted
`src` — worktree code is live only after it lands on `main` and the main
checkout is updated. These batches also changed shared packages and Prisma
schemas, so after pulling:

1. Deploy order: **auth → routing → file → image → chat.** auth first or paid
   users read the new plan gates as false (ADR-122); routing before file or
   paid transcription fails closed on an unpriced model.
2. `./scripts/claw.sh service:rebuild <svc>` for every service whose
   `@claw/shared-*` import changed (restart is not enough — the image bakes the
   packages; see [06-docker-toolkit](./06-docker-toolkit.md)). file-service also
   needs the rebuild for the Debian `ffmpeg` package.
3. Migrations applied (routing roles + seeds v4–v6, auth plan gates + TTS rate,
   image supersession).

## 1. The capability matrix (what should happen)

```bash
export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"
export QA_LAB_EMAIL=<admin> QA_LAB_PASSWORD='<admin password>'
node scripts/qa-lab/multimodal-capability-matrix.mjs            # internal snapshot on :4003
node scripts/qa-lab/multimodal-capability-matrix.mjs --source=available-models   # via nginx only
node scripts/qa-lab/multimodal-capability-matrix.mjs --fixture=scripts/qa-lab/multimodal-matrix.fixture.json
```

Per chat model: image native / helper / OCR, audio → transcript (engine =
first of GEMINI, OPENAI with `AUDIO`, the file-service order), video native /
frames + transcript / helper frames, image generation (always delegated to
image-service), TTS voice (first enabled `TTS_VOICE`). Every cell comes from the
connector `models-snapshot` + `GET /routing/assistant-models/{VISION_HELPER,TTS_VOICE}`
— never edit a table by hand (pack §124). Renderer tests:
`tools/__tests__/multimodal-capability-matrix.test.mjs`.

## 2. The live script (what does happen)

```bash
export QA_ADMIN_EMAIL=<admin> QA_ADMIN_PASSWORD='<admin password>'
bash qa/test-multimodal.sh        # exit code = FAIL count
```

Accounts: a throwaway **free** user and a throwaway **paid** user (plan
`QA_PAID_PLAN_SLUG`, default `pro`, plus a `$2` admin credit adjustment) are
created with random passwords that are never printed; pass
`QA_FREE_EMAIL/PASSWORD` and `QA_PAID_EMAIL/PASSWORD` to reuse your own. The
header of the script lists every knob and timeout.

| Lane                   | Proves                                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image on a blind model | ingestion COMPLETED; paid `fileDelivery` = `DERIVED_IMAGE_TEXT` (helper vision), free = `OMITTED_NO_VISION` (plan gate)                                               |
| TTS                    | availability; paid read-aloud → `fileId`; replay → same `fileId`, `cached=true`, no new `TTS` CONSUMPTION row; free 403                                               |
| Voice note             | transcript replaces the `[Audio file: ` placeholder; ledger `TRANSCRIPTION` RESERVATION and CONSUMPTION both grow                                                     |
| Video                  | `FILE_VIDEO_PROCESS` lands `extractionMetadata.media`; `[00:` timestamps; frames route 401/403/404 through nginx                                                      |
| Video chat             | "what happens at 0:02" → `VIDEO_FRAMES_AND_TRANSCRIPT` or `NATIVE_VIDEO`                                                                                              |
| Image generation       | paid → generation COMPLETED; free → `metadata.type=plan_feature_disabled`, `planFeature=allowImageGeneration`                                                         |
| Regressions (batch 1)  | non-owner retry / retry-alternate / GET → 404; image + chat SSE without auth → 401                                                                                    |
| Upload rejections      | text renamed `.mp4` → 422 `FILE_SECURITY_CHECK_FAILED`; declared 50 MB + 1 → 400                                                                                      |
| Log lines              | chat `mediaDelivery {`, `visionHelper {`, `videoDelivery {`; file `reserve: held … surface=TRANSCRIPTION`, `finalize: … outcome=FINALIZED`, `videoProcessed: fileId=` |

Fixtures are made at runtime: a 1×1 PNG constant; voice + a 4 s `testsrc`
video by `docker exec claw-file-service ffmpeg`. Speech comes from
`QA_SPEECH_AUDIO`, else the paid TTS output, else a 440 Hz tone.

## 3. Known NOT-RUN / SKIP conditions — report them, never fold them in

- **No working `jq`.** The npm package named `jq` installs a broken shim
  (`Cannot find module 'commander'`); the script checks `jq -n 1` and stops.
  Install jqlang jq.
- **No docker / ffmpeg reachable** → voice (unless TTS bytes exist), video and
  every log-line lane SKIP.
- **Tone fixture** → the `[00:` assertion SKIPs (no words to transcribe).
- **No `TTS_VOICE` provider with a key** → TTS lanes SKIP; with no TTS output
  and no `QA_SPEECH_AUDIO` the transcript lanes run on a tone.
- **PAYG-exempt STT provider** (`metered=false` in the reserve line) → ledger
  lane SKIPs.
- **AUTO picked a native-video model** → `videoDelivery` log line SKIPs.
- **Stale containers** (§0) look exactly like product bugs: a paid user refused
  image generation, `z.nativeEnum(undefined)` at boot, a video stuck at its
  placeholder. Check §0 before filing anything.

## Never

- Never commit credentials — every account comes from env or is created.
- Never run this against production users; it creates accounts and adjusts a
  wallet.
- Never add an unbounded wait: every poll goes through `poll <deadline>`.
