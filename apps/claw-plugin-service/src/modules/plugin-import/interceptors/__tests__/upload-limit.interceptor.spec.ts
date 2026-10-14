import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';

import { ImportErrorCode } from '../../../../common/enums/import-error-code.enum';
import { translateUploadError as translate } from '../../utilities/translate-upload-error.utility';

describe('upload limit interceptor', () => {
  it('gives multer 413 the FILE_TOO_LARGE errorCode and keeps the status', () => {
    const result = translate(new PayloadTooLargeException('File too large'));

    expect(result).toMatchObject({ importCode: ImportErrorCode.FILE_TOO_LARGE, status: 413 });
    expect((result as { getResponse: () => unknown }).getResponse()).toMatchObject({
      errorCode: 'PLUGIN_IMPORT_FILE_TOO_LARGE',
    });
  });

  it('leaves other errors alone', () => {
    const other = new BadRequestException('x');

    expect(translate(other)).toBe(other);
  });
});
