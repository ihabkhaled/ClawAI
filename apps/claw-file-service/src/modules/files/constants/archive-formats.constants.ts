import { ArchiveFormat } from '../../../common/enums/archive-format.enum';
import type { ArchiveSignature, StreamSuffixRule } from '../types/archive-engine.types';

// Archive formats beyond ZIP (batch A2). ZIP keeps its own node-stream-zip path;
// everything else goes through 7-Zip compiled to WASM (`7z-wasm`). ADR-114.

/**
 * Every MIME type routed to archive expansion, and the formats its bytes may
 * really be. The upload's magic bytes must sniff as one of them, or the upload
 * is rejected — the same rule `MIME_TO_MAGIC_BYTES` applies to a PDF.
 *
 * Several aliases exist because browsers and operating systems disagree:
 * Windows labels a `.tgz` `application/x-compressed`, freedesktop labels it
 * `application/x-compressed-tar`, and `application/x-gtar` is used for both a
 * plain and a gzipped tar.
 */
export const ARCHIVE_MIME_ACCEPTED_FORMATS: ReadonlyMap<string, readonly ArchiveFormat[]> = new Map<
  string,
  readonly ArchiveFormat[]
>([
  ['application/zip', [ArchiveFormat.ZIP]],
  ['application/x-zip-compressed', [ArchiveFormat.ZIP]],
  ['application/x-7z-compressed', [ArchiveFormat.SEVEN_ZIP]],
  ['application/vnd.rar', [ArchiveFormat.RAR, ArchiveFormat.RAR5]],
  ['application/x-rar-compressed', [ArchiveFormat.RAR, ArchiveFormat.RAR5]],
  ['application/x-rar', [ArchiveFormat.RAR, ArchiveFormat.RAR5]],
  ['application/x-tar', [ArchiveFormat.TAR]],
  ['application/x-gtar', [ArchiveFormat.TAR, ArchiveFormat.GZIP]],
  ['application/gzip', [ArchiveFormat.GZIP]],
  ['application/x-gzip', [ArchiveFormat.GZIP]],
  ['application/x-compressed-tar', [ArchiveFormat.GZIP]],
  ['application/x-compressed', [ArchiveFormat.GZIP]],
  ['application/x-bzip2', [ArchiveFormat.BZIP2]],
  ['application/x-bzip', [ArchiveFormat.BZIP2]],
  ['application/x-bzip-compressed-tar', [ArchiveFormat.BZIP2]],
  ['application/x-bzip2-compressed-tar', [ArchiveFormat.BZIP2]],
  ['application/x-xz', [ArchiveFormat.XZ]],
  ['application/x-xz-compressed-tar', [ArchiveFormat.XZ]],
]);

/** Every MIME type that is expanded as an archive, ZIP included. */
export const ARCHIVE_MIME_TYPES: readonly string[] = [...ARCHIVE_MIME_ACCEPTED_FORMATS.keys()];

/**
 * The MIME type an archive is stored under when its upload was mislabelled
 * (`application/octet-stream`, `text/plain`, …) and its bytes say what it is.
 */
export const CANONICAL_ARCHIVE_MIME_BY_FORMAT: ReadonlyMap<ArchiveFormat, string> = new Map([
  [ArchiveFormat.ZIP, 'application/zip'],
  [ArchiveFormat.SEVEN_ZIP, 'application/x-7z-compressed'],
  [ArchiveFormat.RAR, 'application/vnd.rar'],
  [ArchiveFormat.RAR5, 'application/vnd.rar'],
  [ArchiveFormat.TAR, 'application/x-tar'],
  [ArchiveFormat.GZIP, 'application/gzip'],
  [ArchiveFormat.BZIP2, 'application/x-bzip2'],
  [ArchiveFormat.XZ, 'application/x-xz'],
]);

/**
 * What `file-type` reports for a PLAIN archive. It is consulted before
 * re-labelling a mislabelled upload because it looks inside ZIP containers: a
 * DOCX, XLSX, EPUB or JAR is a ZIP by signature and must not be expanded as one.
 */
export const DETECTED_MIME_TO_ARCHIVE_FORMAT: ReadonlyMap<string, ArchiveFormat> = new Map([
  ['application/zip', ArchiveFormat.ZIP],
  ['application/x-7z-compressed', ArchiveFormat.SEVEN_ZIP],
  ['application/x-rar-compressed', ArchiveFormat.RAR],
  ['application/vnd.rar', ArchiveFormat.RAR],
  ['application/x-tar', ArchiveFormat.TAR],
  ['application/gzip', ArchiveFormat.GZIP],
  ['application/x-bzip2', ArchiveFormat.BZIP2],
  ['application/x-xz', ArchiveFormat.XZ],
]);

/**
 * Declared MIME types whose bytes nothing else verifies — the only labels a
 * sniffed archive may override. A declared PDF, image, video or audio file has
 * its own signature check, which rejects archive bytes instead.
 */
export const REROUTABLE_MIME_PREFIXES: readonly string[] = ['text/', 'application/'];

/** Offset-anchored archive signatures, checked in order. TAR is checked separately. */
export const ARCHIVE_SIGNATURES: readonly ArchiveSignature[] = [
  { format: ArchiveFormat.ZIP, offset: 0, bytes: Buffer.from([0x50, 0x4b, 0x03, 0x04]) },
  // An empty ZIP (end-of-central-directory only) and a spanned one.
  { format: ArchiveFormat.ZIP, offset: 0, bytes: Buffer.from([0x50, 0x4b, 0x05, 0x06]) },
  { format: ArchiveFormat.ZIP, offset: 0, bytes: Buffer.from([0x50, 0x4b, 0x07, 0x08]) },
  {
    format: ArchiveFormat.SEVEN_ZIP,
    offset: 0,
    bytes: Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]),
  },
  // RAR5 before RAR4: the RAR4 signature is a prefix of neither, but keep the
  // longer, more specific one first.
  {
    format: ArchiveFormat.RAR5,
    offset: 0,
    bytes: Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00]),
  },
  {
    format: ArchiveFormat.RAR,
    offset: 0,
    bytes: Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]),
  },
  { format: ArchiveFormat.GZIP, offset: 0, bytes: Buffer.from([0x1f, 0x8b]) },
  { format: ArchiveFormat.BZIP2, offset: 0, bytes: Buffer.from('BZh') },
  {
    format: ArchiveFormat.XZ,
    offset: 0,
    bytes: Buffer.from([0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00]),
  },
];

/** How many leading bytes are read to sniff a format: one tar header block. */
export const ARCHIVE_SNIFF_BYTES = 512;

// A tar has no signature at offset 0. POSIX and GNU tars carry "ustar" at 257;
// a pre-POSIX (v7) tar is recognised by its header checksum alone.
export const TAR_BLOCK_BYTES = 512;
export const TAR_MAGIC_OFFSET = 257;
export const TAR_MAGIC = Buffer.from('ustar');
export const TAR_CHECKSUM_OFFSET = 148;
export const TAR_CHECKSUM_LENGTH = 8;
export const TAR_CHECKSUM_SPACE = 0x20;
export const OCTAL_RADIX = 8;

/** Formats that are one compressed stream rather than a table of entries. */
export const STREAM_CODEC_FORMATS: ReadonlySet<ArchiveFormat> = new Set([
  ArchiveFormat.GZIP,
  ArchiveFormat.BZIP2,
  ArchiveFormat.XZ,
]);

/** Naming rules for a stream codec's single member, tried in order. */
export const STREAM_SUFFIX_RULES: readonly StreamSuffixRule[] = [
  { suffix: '.tgz', replacement: '.tar' },
  { suffix: '.tbz2', replacement: '.tar' },
  { suffix: '.tbz', replacement: '.tar' },
  { suffix: '.txz', replacement: '.tar' },
  { suffix: '.gz', replacement: '' },
  { suffix: '.bz2', replacement: '' },
  { suffix: '.xz', replacement: '' },
];

/**
 * Extensions that mark an entry as a nested archive, so one at the depth limit
 * is skipped before it is extracted. An archive with no such extension is still
 * caught by its magic bytes when it is onboarded.
 */
export const ARCHIVE_FILE_EXTENSIONS: readonly string[] = [
  '.zip',
  '.7z',
  '.rar',
  '.tar',
  '.gz',
  '.tgz',
  '.bz2',
  '.tbz2',
  '.tbz',
  '.xz',
  '.txz',
];

// ── 7-Zip engine ────────────────────────────────────────────────────────────

/** Where the archive's host directory is mounted inside the engine. */
export const SEVEN_ZIP_INPUT_MOUNT = '/claw-in';
/** Where the extraction directory is mounted inside the engine. */
export const SEVEN_ZIP_OUTPUT_MOUNT = '/claw-out';
/** The entry list handed to `x`, in the engine's in-memory filesystem. */
export const SEVEN_ZIP_LISTFILE_PATH = '/claw-extract-list.txt';

/**
 * 7-Zip refuses to unpack anything whose decoder needs more than this
 * (`-smemx`). The engine's WASM heap tops out at 2 GB and a 7z or RAR header
 * can ask for a multi-gigabyte dictionary; 256 MB covers LZMA2 at -mx9 (64 MB),
 * xz -9 (64 MB) and WinRAR's default (32 MB) with room to spare.
 */
export const SEVEN_ZIP_MEMORY_LIMIT_SWITCH = '-smemx256m';

/** Printed when 7-Zip needs a password it was not given (encrypted headers). */
export const SEVEN_ZIP_PASSWORD_PROMPT = 'Enter password';

/** Line that separates the archive block from the entry blocks in `l -slt`. */
export const SEVEN_ZIP_LISTING_SEPARATOR = '----------';

/** Key/value separator in `l -slt` output. */
export const SEVEN_ZIP_LISTING_KEY_SEPARATOR = ' =';

/**
 * Listing text allowed per permitted entry. A tar entry prints about 450 bytes;
 * the cap bounds memory for an archive with millions of tiny entries, which is
 * rejected for its entry count once the listing is cut.
 */
export const SEVEN_ZIP_LISTING_BYTES_PER_ENTRY = 4096;
/** Fixed room for the listing's banner and archive block. */
export const SEVEN_ZIP_LISTING_BASE_BYTES = 64 * 1024;

/** How much of stderr is kept for a diagnostic message. */
export const SEVEN_ZIP_STDERR_MAX_BYTES = 2048;

/** Exit codes: 0 ok, 1 warning (non-fatal), 2+ fatal. */
export const SEVEN_ZIP_EXIT_OK = 0;
export const SEVEN_ZIP_EXIT_WARNING = 1;

/** Stream output is written to disk in blocks this large. */
export const SEVEN_ZIP_WRITE_BUFFER_BYTES = 64 * 1024;

/** Suffix of the sibling file a stream codec is decompressed into. */
export const STREAM_PAYLOAD_SUFFIX = '.payload';

/** Name of a stream codec's member when the archive's own name yields none. */
export const STREAM_FALLBACK_MEMBER_NAME = 'decompressed';

/** `l -slt` keys the extractor reads. */
export const LISTING_KEY = {
  PATH: 'Path',
  FOLDER: 'Folder',
  SIZE: 'Size',
  PACKED_SIZE: 'Packed Size',
  ATTRIBUTES: 'Attributes',
  MODE: 'Mode',
  ENCRYPTED: 'Encrypted',
  SYMBOLIC_LINK: 'Symbolic Link',
  HARD_LINK: 'Hard Link',
  LINK: 'Link',
  CHARACTERISTICS: 'Characteristics',
} as const;

/** How `l -slt` prints a true flag (`Folder = +`, `Encrypted = +`). */
export const LISTING_FLAG_TRUE = '+';

/** Length of a POSIX mode string such as "lrwxrwxrwx". */
export const POSIX_MODE_LENGTH = 10;
export const POSIX_DIRECTORY_TYPE = 'd';
export const POSIX_LINK_TYPE = 'l';
/** Character device, block device, FIFO, socket. */
export const POSIX_SPECIAL_TYPES: ReadonlySet<string> = new Set(['c', 'b', 'p', 's']);
/** Windows-style attribute letter for a directory ("D drwxr-xr-x"). */
export const ATTRIBUTE_DIRECTORY_FLAG = 'D';

// Tar typeflags, as 7-Zip prints them first in `Characteristics`.
export const TAR_DIRECTORY_TYPEFLAG = '5';
export const TAR_LINK_TYPEFLAGS: ReadonlySet<string> = new Set(['1', '2']);
export const TAR_SPECIAL_TYPEFLAGS: ReadonlySet<string> = new Set(['3', '4', '6']);

// Error codes new in A2. The ZIP_* codes keep their names for every format:
// consumers already match on them.
export const ARCHIVE_UNSUPPORTED_FORMAT_ERROR_CODE = 'ARCHIVE_UNSUPPORTED_FORMAT';
export const ARCHIVE_LISTING_INVALID_ERROR_CODE = 'ARCHIVE_LISTING_INVALID';
