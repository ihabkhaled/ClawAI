// Part names inside an OOXML container. Fixed by the ECMA-376 package layout,
// so these are format constants rather than configuration.

export const XLSX_SHARED_STRINGS_ENTRY = 'xl/sharedStrings.xml';
export const XLSX_WORKBOOK_ENTRY = 'xl/workbook.xml';
export const XLSX_WORKSHEET_ENTRY_PATTERN = /^xl\/worksheets\/sheet\d+\.xml$/;

export const PPTX_SLIDE_ENTRY_PATTERN = /^ppt\/slides\/slide\d+\.xml$/;
export const PPTX_NOTES_ENTRY_PATTERN = /^ppt\/notesSlides\/notesSlide\d+\.xml$/;

// Zip-bomb bounds for the OOXML path.
//
// An .xlsx is a ZIP and is user input, so it gets the same treatment as any
// other archive this service opens (ADR-053). These are in-memory limits rather
// than the extract-to-disk thresholds in zip-expansion.constants.ts, because
// nothing here is written out.
//
// Sized against reality, not against the format's theoretical maximum: a
// 5,000-row spreadsheet's sharedStrings.xml is well under a megabyte, and a
// 200-slide deck has roughly 400 parts. A file that exceeds these is not a
// document someone means a model to read.
export const OOXML_MAX_UNCOMPRESSED_ENTRY_BYTES = 64 * 1024 * 1024;
export const OOXML_MAX_TOTAL_TEXT_BYTES = 128 * 1024 * 1024;
export const OOXML_MAX_ENTRY_COUNT = 5000;
