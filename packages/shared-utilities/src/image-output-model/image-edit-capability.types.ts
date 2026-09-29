/**
 * What one `IMAGE_*` provider can do with an attached image.
 *
 * `reference` — it really uses the attachment (Gemini inline image, OpenAI
 * `/images/edits`, SD WebUI img2img). A provider without it would silently
 * turn an edit into an unrelated new picture.
 * `mask` — it accepts an alpha mask that limits WHERE the edit applies.
 * `editModel` — the model an edit runs on when the picked model of that
 * provider cannot edit (OpenAI dall-e-3 → gpt-image-1).
 * `editModelPattern` — which of the provider's models can edit; absent = all.
 */
export type ImageEditCapability = {
  provider: string;
  reference: boolean;
  mask: boolean;
  editModel: string;
  editModelPattern?: RegExp;
};
