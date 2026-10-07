# Threads marketing screenshots

The public Threads page (`/features/threads`) shows six real screenshots of the product, one per
step. They live in `apps/claw-frontend/public/marketing/threads/` and are listed in
`THREADS_MARKETING_STEP_IMAGES` (`constants/threads-marketing.constants.ts`). They are captured
from the running app, never drawn, so retake them when the interface changes.

| Step | File                       | What it shows                                                        |
| ---- | -------------------------- | -------------------------------------------------------------------- |
| 1    | `step-1-chat-menu.png`     | A finished chat with the chat menu open on "Turn into public Thread" |
| 2    | `step-2-create-dialog.png` | The create dialog: topic, type, language, spend cap, models, consent |
| 3    | `step-3-model-picker.png`  | The model picker open: provider groups and the "Uses credit" badges  |
| 4    | `step-4-spend-cap.png`     | The spend cap field and the Start button, ready to run               |
| 5    | `step-5-live-stages.png`   | A running Thread on the review page, showing the stage and round     |
| 6    | `step-6-published.png`     | A published article with sources, the view counter, share and export |

## How to retake them

1. Rebuild whatever you changed (`./scripts/claw.sh --dev service:rebuild <service>`) and
   `docker restart claw-frontend`.
2. Sign in as a user whose plan includes Threads (Free, Starter, Plus, Pro, or an administrator).
   Use a real, tidy chat. Do not photograph test chats (no "pong" replies, no credit-fallback
   notices).
3. Use a 1280 px wide viewport. Hide the PWA "Install ClawAI" button before the shot
   (`display: none` on it in the console) because it covers the dialog on short screens.
4. Save each PNG under the file name above and update the width and height in the constants file.
5. Never show a real person's email, a token, or a private chat. Screenshots are public.

The alt text is the step title in the visitor's language, so a screenshot of an English interface
still has a translated description for a reader who uses a screen reader.
