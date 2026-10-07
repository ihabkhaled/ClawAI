/** Saves bytes or text as a file through a temporary link. */
export function saveThreadFile(name: string, mime: string, data: BlobPart): void {
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
