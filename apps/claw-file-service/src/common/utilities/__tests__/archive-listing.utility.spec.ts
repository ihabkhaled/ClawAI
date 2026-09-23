import { parseSevenZipListing } from '../archive-listing.utility';
import { BusinessException } from '../../errors/business.exception';
import { ArchiveFormat } from '../../enums/archive-format.enum';

const HEADER = [
  '7-Zip (z) 24.09 (LE) : Copyright (c) 1999-2024 Igor Pavlov : 2024-11-29',
  '',
  'Listing archive: /claw-in/x',
  '',
  '--',
  'Path = /claw-in/x',
  'Type = 7z',
  '',
  '----------',
];

const listing = (...blocks: string[][]): string =>
  [...HEADER, ...blocks.flatMap((block) => [...block, ''])].join('\n');

const codeOf = (run: () => unknown): string => {
  try {
    run();
  } catch (error: unknown) {
    return error instanceof BusinessException ? error.code : 'not-business';
  }
  return 'no-throw';
};

describe('parseSevenZipListing', () => {
  it('reads name, sizes, directory and encryption flags from 7z blocks', () => {
    const text = listing(
      ['Path = src', 'Size = 0', 'Packed Size = 0', 'Attributes = D drwxr-xr-x', 'Encrypted = -'],
      [
        'Path = src/a.ts',
        'Size = 1200',
        'Packed Size = 38',
        'Attributes = A -rw-r--r--',
        'Encrypted = +',
      ],
      [
        'Path = src/b.ts',
        'Size = 4',
        'Packed Size = ',
        'Attributes = A -rw-r--r--',
        'Encrypted = -',
      ],
    );

    expect(parseSevenZipListing(text, ArchiveFormat.SEVEN_ZIP)).toEqual([
      expect.objectContaining({ name: 'src', isDirectory: true }),
      expect.objectContaining({
        name: 'src/a.ts',
        isDirectory: false,
        size: 1200,
        compressedSize: 38,
        encrypted: true,
        isLink: false,
        isSpecialFile: false,
      }),
      expect.objectContaining({ name: 'src/b.ts', size: 4, compressedSize: 0, encrypted: false }),
    ]);
  });

  it('flags a 7z symlink from its POSIX attribute', () => {
    const text = listing(['Path = link', 'Size = 11', 'Attributes = A lrwxrwxrwx']);

    expect(parseSevenZipListing(text, ArchiveFormat.SEVEN_ZIP)[0]?.isLink).toBe(true);
  });

  it('reads tar typeflags: links, devices and directories', () => {
    const tar = (name: string, mode: string, flag: string, link = ''): string[] => [
      `Path = ${name}`,
      'Folder = -',
      'Size = 0',
      'Packed Size = 0',
      `Mode = ${mode}`,
      `Symbolic Link = ${flag === '2' ? link : ''}`,
      `Hard Link = ${flag === '1' ? link : ''}`,
      `Characteristics = ${flag} POSIX ASCII`,
    ];
    const text = listing(
      tar('sym', 'lrwxrwxrwx', '2', '/etc/passwd'),
      tar('hard', '-rw-r--r--', '1', 'sym'),
      tar('dev', 'crw-r--r--', '3'),
      tar('fifo', 'prw-r--r--', '6'),
      tar('dir', 'drwxr-xr-x', '5'),
    );

    const entries = parseSevenZipListing(text, ArchiveFormat.TAR);

    expect(
      entries.map((entry) => [entry.name, entry.isLink, entry.isSpecialFile, entry.isDirectory]),
    ).toEqual([
      ['sym', true, false, false],
      ['hard', true, false, false],
      ['dev', false, true, false],
      ['fifo', false, true, false],
      ['dir', false, false, true],
    ]);
  });

  it('returns no entries when there is no separator (an empty archive)', () => {
    expect(parseSevenZipListing(HEADER.slice(0, -1).join('\n'), ArchiveFormat.TAR)).toEqual([]);
  });

  it('stops at trailing text after the last block', () => {
    const text = `${listing(['Path = a', 'Size = 1'])}\nWarnings: 1\n`;

    expect(parseSevenZipListing(text, ArchiveFormat.TAR)).toHaveLength(1);
  });

  it('accepts CRLF line endings', () => {
    const text = listing(['Path = a.txt', 'Size = 3']).replaceAll('\n', '\r\n');

    expect(parseSevenZipListing(text, ArchiveFormat.TAR)[0]).toEqual(
      expect.objectContaining({ name: 'a.txt', size: 3 }),
    );
  });

  it('keeps a leading space in a name', () => {
    const text = listing(['Path =  spaced.txt', 'Size = 1']);

    expect(parseSevenZipListing(text, ArchiveFormat.TAR)[0]?.name).toBe(' spaced.txt');
  });

  describe('refuses a listing it cannot trust', () => {
    it.each([
      ['a repeated key', ['Path = a', 'Size = 1', 'Size = 999999']],
      ['a line that is not Key = Value', ['Path = a', 'Size = 1', 'garbage line']],
      ['a file with no declared size', ['Path = a', 'Size = ', 'Folder = -']],
      ['a malformed size', ['Path = a', 'Size = 12abc']],
      ['an impossible size', ['Path = a', 'Size = 99999999999999999999']],
    ])('%s', (_label, block) => {
      expect(codeOf(() => parseSevenZipListing(listing(block), ArchiveFormat.TAR))).toBe(
        'ARCHIVE_LISTING_INVALID',
      );
    });
  });
});
