# Chat models make media: marketing screenshots and video

The public page `/features/chat-models-make-media` (a `FeatureCapability` page, see
[seo-content-architecture.md](../../05-frontend/seo-content-architecture.md) section 11) currently reuses the
shared chat-conversation and model-picker scenes. It ships **without** dedicated screenshots or a demo video, and
that is a recorded gap against [rule 66](../../../rules/66-every-flagship-feature-ships-a-public-marketing-page.md),
not a finished state.

## To capture (pending, needs the running stack and real provider spend)

| Shot | What it shows                                                                                |
| ---- | -------------------------------------------------------------------------------------------- |
| 1    | A tidy chat where a Grok, GPT or Gemini model answered with a generated image under the text |
| 2    | The same for a short video, mid-playback                                                     |
| 3    | The same for an audio clip with the player                                                   |
| 4    | The model picker with the Image, Video and Audio kinds and the Audio badge                   |

Video and audio calls cost real money; capture one of each, once. Follow
[the Threads retake guide](../clawai-threads/marketing-screenshots.md) for viewport (1280 px), tidy-chat and PWA
button rules. Then add the files under a new folder named chat-models-make-media under the frontend marketing public assets, list them with
`src/`, `width` and `height` in a constants file, add a scene id in `marketing-scenes.constants.ts`, and update
`FEATURE_CAPABILITY_SCENES`. Claude does not generate media itself: show a Grok, GPT or Gemini model, and never imply
otherwise in a caption.
