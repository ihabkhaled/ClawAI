// Extracts real File objects from a clipboard or drag DataTransfer. Handles
// both the `.files` list (dropped files, OS clipboard files) and the `.items`
// list (screenshots / copied images, which often appear only as items of
// kind 'file'). De-duplicates by identity so an item that also appears in
// `.files` is not counted twice.
export function extractFilesFromDataTransfer(
  source: DataTransfer | null | undefined,
): File[] {
  if (source === null || source === undefined) {
    return [];
  }

  const collected: File[] = [];
  const seen = new Set<File>();

  const add = (file: File | null): void => {
    if (file !== null && !seen.has(file)) {
      seen.add(file);
      collected.push(file);
    }
  };

  if (source.items.length > 0) {
    for (const item of Array.from(source.items)) {
      if (item.kind === 'file') {
        add(item.getAsFile());
      }
    }
  }

  for (const file of Array.from(source.files)) {
    add(file);
  }

  return collected;
}
