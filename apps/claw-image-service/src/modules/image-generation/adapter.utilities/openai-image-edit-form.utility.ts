import {
  OPENAI_EDIT_IMAGE_FIELD,
  OPENAI_EDIT_MASK_FIELD,
  OPENAI_EDIT_MASK_FILENAME,
  OPENAI_EDIT_SOURCE_FILENAME,
  PNG_MIME_TYPE,
} from '../constants/image-edit.constants';
import { type OpenAIImageEditRequest } from '../types/image-edit.types';

/** The multipart body of one edit: `image[]` + prompt, n=1, size, pinned quality, optional mask. */
export function buildOpenAIEditForm(request: OpenAIImageEditRequest): FormData {
  const form = new FormData();
  form.append('model', request.model);
  form.append('prompt', request.prompt);
  form.append('n', '1');
  form.append('size', `${String(request.width)}x${String(request.height)}`);
  if (request.quality) {
    form.append('quality', request.quality);
  }
  const source = Buffer.from(request.imageBase64, 'base64');
  form.append(
    OPENAI_EDIT_IMAGE_FIELD,
    new Blob([source], { type: request.imageMimeType ?? PNG_MIME_TYPE }),
    OPENAI_EDIT_SOURCE_FILENAME,
  );
  if (request.maskBase64 !== undefined) {
    const mask = Buffer.from(request.maskBase64, 'base64');
    form.append(
      OPENAI_EDIT_MASK_FIELD,
      new Blob([mask], { type: PNG_MIME_TYPE }),
      OPENAI_EDIT_MASK_FILENAME,
    );
  }
  return form;
}
