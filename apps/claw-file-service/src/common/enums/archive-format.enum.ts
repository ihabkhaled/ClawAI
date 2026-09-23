/**
 * Archive formats file-service can open.
 *
 * The values are the archive type names 7-Zip's `-t` switch takes, so the
 * engine wrapper passes them straight through and never guesses the format
 * from a file extension an uploader chose.
 *
 * GZIP, BZIP2 and XZ are STREAM codecs: one compressed stream, no entry table.
 * A `.tar.gz` is a GZIP whose decompressed payload is a TAR.
 */
export enum ArchiveFormat {
  ZIP = 'zip',
  SEVEN_ZIP = '7z',
  /** RAR 1.5–4.x. 7-Zip opens it only as `rar`, never as `rar5`. */
  RAR = 'rar',
  /** RAR 5+ (WinRAR's default since 5.0). 7-Zip refuses it under `-trar`. */
  RAR5 = 'rar5',
  TAR = 'tar',
  GZIP = 'gzip',
  BZIP2 = 'bzip2',
  XZ = 'xz',
}
