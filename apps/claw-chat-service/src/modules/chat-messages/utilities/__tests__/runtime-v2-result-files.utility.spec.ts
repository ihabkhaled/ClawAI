import { describe, expect, it } from 'vitest';

import { RUNTIME_V2_RESULT_FILES_NOTE_PREFIX } from '../../constants/runtime-v2-result-files.constants';
import {
  runtimeV2ContinuationFileIds,
  runtimeV2ResultFilesNote,
} from '../runtime-v2-result-files.utility';

const history = [
  { role: 'USER', metadata: { fileIds: ['prompt-file'] } },
  { role: 'TOOL', metadata: { runtimeV2: { kind: 'tool-result' } } },
];

describe('runtimeV2ContinuationFileIds', () => {
  it('leaves the gateway default alone when the result has no files', () => {
    expect(runtimeV2ContinuationFileIds(history, undefined)).toEqual({});
    expect(runtimeV2ContinuationFileIds(history, [])).toEqual({});
  });

  it('keeps the prompt attachments and adds the result images once', () => {
    expect(runtimeV2ContinuationFileIds(history, ['shot-1', 'prompt-file'])).toEqual({
      fileIds: ['prompt-file', 'shot-1'],
    });
  });

  it('uses only the result images when the prompt had none', () => {
    expect(runtimeV2ContinuationFileIds([{ role: 'USER', metadata: null }], ['shot-1'])).toEqual({
      fileIds: ['shot-1'],
    });
  });
});

describe('runtimeV2ResultFilesNote', () => {
  it('is null without files', () => {
    expect(runtimeV2ResultFilesNote(undefined)).toBeNull();
    expect(runtimeV2ResultFilesNote([])).toBeNull();
  });

  it('names every result image', () => {
    expect(runtimeV2ResultFilesNote(['shot-1', 'shot-2'])).toBe(
      `${RUNTIME_V2_RESULT_FILES_NOTE_PREFIX} shot-1, shot-2.`,
    );
  });
});
