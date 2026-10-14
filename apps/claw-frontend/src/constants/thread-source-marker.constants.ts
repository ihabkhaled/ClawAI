/** Characters a source-marker bracket run can contain: brackets, commas, whitespace and hex digits. */
export const THREAD_SOURCE_MARKER_RUN_CHARACTER = /[\s,[\]0-9a-f]/iu;
/** A bracket group inside a run, used when only part of the run is made of source ids. */
export const THREAD_SOURCE_MARKER_GROUP = /\[{1,2}[\s,0-9a-f]+\]{1,2}/giu;
export const THREAD_SOURCE_MARKER_SEPARATOR = /[\s,[\]]+/u;
/** An internal source id: 16 hex characters. */
export const THREAD_SOURCE_MARKER_ID = /^[0-9a-f]{16}$/iu;
export const THREAD_SOURCE_MARKER_EXTRA_SPACES = /[ \t]{2,}/gu;
