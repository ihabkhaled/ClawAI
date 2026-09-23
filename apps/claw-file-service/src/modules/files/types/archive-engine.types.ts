import type { ArchiveFormat } from '../../../common/enums/archive-format.enum';

/** Bytes that identify an archive format at a fixed offset. */
export type ArchiveSignature = {
  format: ArchiveFormat;
  offset: number;
  bytes: Buffer;
};

/** How a stream codec's single member is named from the archive's own name. */
export type StreamSuffixRule = {
  /** Lower-case suffix of the archive name, e.g. ".tgz". */
  suffix: string;
  /** What replaces it, e.g. ".tar" — or "" to just drop it. */
  replacement: string;
};

/** Per-call options for opening one archive. */
export type ArchiveExtractionOptions = {
  /**
   * The archive's display filename. A gzip/bzip2/xz member is named after it
   * (`report.csv.gz` → `report.csv`); the on-disk storage name carries a
   * timestamp prefix and is never shown to anyone.
   */
  archiveFilename: string;
  /**
   * Batch A3: a password the user typed for THIS extraction. It is passed to
   * the engine as an argument and nowhere else — never stored, never logged,
   * never put in an error message.
   */
  password?: string;
};

/** A host directory mounted into the engine's virtual filesystem. */
export type SevenZipMount = {
  hostDir: string;
  mountPoint: string;
};

/** A small file written into the engine's in-memory filesystem before it runs. */
export type SevenZipMemoryFile = {
  path: string;
  content: string;
};

/** Receives every byte 7-Zip writes to stdout. Throwing aborts the write with EIO. */
export type SevenZipByteSink = (byte: number) => void;

/** Buffers engine output as text, up to a byte limit. */
export type SevenZipTextCollector = {
  push: SevenZipByteSink;
  text(): string;
  /** True once output past the limit was refused. */
  overflowed(): boolean;
};

/** Streams engine output into a host file, refusing bytes past a limit. */
export type SevenZipFileSink = {
  push: SevenZipByteSink;
  close(): void;
  bytesWritten(): number;
  exceeded(): boolean;
};

/** One 7-Zip command line and its environment. */
export type SevenZipInvocation = {
  /** Arguments WITHOUT the password — safe to log. */
  args: string[];
  password?: string;
  mounts: SevenZipMount[];
  memoryFiles: SevenZipMemoryFile[];
  onStdout: SevenZipByteSink;
};

/** What a 7-Zip run left behind. */
export type SevenZipRunOutcome = {
  /** 7-Zip's exit code, or null when the engine threw instead of exiting. */
  exitCode: number | null;
  /** The head of stderr, for diagnostics. Never contains the password. */
  stderr: string;
};

export type SevenZipListRequest = {
  archivePath: string;
  format: ArchiveFormat;
  password?: string;
  /** Listing text beyond this many bytes aborts the run (an entry-count bomb). */
  maxOutputBytes: number;
};

export type SevenZipListOutcome = SevenZipRunOutcome & {
  text: string;
  /** 7-Zip asked for a password: the archive's headers are encrypted. */
  passwordRequired: boolean;
  /** The listing was cut at `maxOutputBytes`. */
  outputLimitReached: boolean;
};

export type SevenZipExtractRequest = {
  archivePath: string;
  format: ArchiveFormat;
  destDir: string;
  /** Exact entry names to extract, as the listing printed them. */
  entryNames: readonly string[];
  password?: string;
};

export type SevenZipStreamRequest = {
  archivePath: string;
  format: ArchiveFormat;
  /** Host file the decompressed stream is written to. */
  outPath: string;
  /** The run is aborted as soon as the stream passes this many bytes. */
  maxBytes: number;
  password?: string;
};

export type SevenZipStreamOutcome = SevenZipRunOutcome & {
  bytesWritten: number;
  limitExceeded: boolean;
};

/** An archive with an entry table (7z, RAR, tar) about to be opened by 7-Zip. */
export type ContainerArchiveSource = {
  archivePath: string;
  format: ArchiveFormat;
  /**
   * Bytes the archive occupied AS UPLOADED — for a `.tar.gz`, the gzip, not the
   * decompressed tar — so the whole-archive ratio is measured against them.
   */
  compressedBytes: number;
};

/** One `Key = Value` block of a `7z l -slt` listing. */
export type SevenZipListingBlock = ReadonlyMap<string, string>;
