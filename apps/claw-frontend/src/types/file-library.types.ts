/** Shared contract between the composer "+" menu and the file library UI. */
export type FileLibraryMenuProps = {
  selectedFileIds: string[];
  onChange: (ids: string[]) => void;
  /** Same chunked/antivirus pipeline as paste, drop and the recorder. */
  ingestFiles: (files: FileList | File[]) => void;
  isUploading: boolean;
  disabled?: boolean;
  /** Called after an action that should close the menu that hosts this one. */
  onDone?: () => void;
};
