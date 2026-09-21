import { uploadFileSchema } from '../upload-file.dto';
import { AUDIO_MIME_TYPES } from '../../types/files.types';

describe('uploadFileSchema audio MIME types', () => {
  it.each([...AUDIO_MIME_TYPES])('accepts the audio MIME type %s', (mimeType) => {
    expect(uploadFileSchema.parse({ filename: 'note.bin', mimeType, sizeBytes: 3 })).toEqual({
      filename: 'note.bin',
      mimeType,
      sizeBytes: 3,
    });
  });

  it.each(['audio/x-aiff', 'audio/opus', 'audio/midi'])(
    'rejects the unsupported audio MIME type %s',
    (mimeType) => {
      expect(() =>
        uploadFileSchema.parse({ filename: 'note.bin', mimeType, sizeBytes: 3 }),
      ).toThrow();
    },
  );
});
