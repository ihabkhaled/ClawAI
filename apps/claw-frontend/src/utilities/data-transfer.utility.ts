// Extracts real File objects from a clipboard or drag DataTransfer.
//
// `.files` is the source of truth (dropped files, files copied in the OS,
// pasted screenshots). `.items` mirrors the SAME files, but every
// `item.getAsFile()` call returns a NEW File object, so merging the two lists
// and de-duplicating by object identity counted one pasted screenshot twice
// (drag and drop only fills `.files`, which is why only paste duplicated).
// `.items` is therefore read only when `.files` is empty, which some browsers
// do for copied images.
export function extractFilesFromDataTransfer(source: DataTransfer | null | undefined): File[] {
  if (source === null || source === undefined) {
    return [];
  }

  const files = Array.from(source.files);
  if (files.length > 0) {
    return files;
  }

  const collected: File[] = [];
  for (const item of Array.from(source.items)) {
    if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file !== null) {
        collected.push(file);
      }
    }
  }
  return collected;
}
