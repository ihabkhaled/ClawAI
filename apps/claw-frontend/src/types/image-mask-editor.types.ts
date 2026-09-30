import type { ImageMaskRefusalCode } from '@/enums/image-mask-refusal-code.enum';
import type { MaskBrushMode } from '@/enums/mask-brush-mode.enum';

// image-mask-editor.types.ts — the inpainting canvas. Exported shapes only.

/** A point in the SOURCE image's own pixel grid (not CSS pixels). */
export type ImagePoint = { x: number; y: number };

export type ImageSize = { width: number; height: number };

/** The slice of `DOMRect` the pointer mapping reads (physical, so RTL-independent). */
export type ClientRectLike = { left: number; top: number; width: number; height: number };

/** A mask ready to upload: PNG bytes as base64, sized exactly like the source. */
export type ExportedMask = {
  base64: string;
  width: number;
  height: number;
  sizeBytes: number;
};

export type UseMaskEditorParams = {
  /** Object URL of the source image; null until it has downloaded. */
  imageUrl: string | null;
};

export type UseMaskEditorReturn = {
  /** Set once the image has decoded; the canvas is sized from it. */
  imageSize: ImageSize | null;
  brushPercent: number;
  setBrushPercent: (value: number) => void;
  mode: MaskBrushMode;
  setMode: (mode: MaskBrushMode) => void;
  hasPaint: boolean;
  /** Where the keyboard brush is, as a percent of the image; null until it is used. */
  keyboardCursor: { leftPercent: number; topPercent: number; diameterPercent: number } | null;
  isKeyboardPainting: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onImageLoad: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  onPointerDown: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLCanvasElement>) => void;
  onBlur: () => void;
  clear: () => void;
  /** The mask PNG, or null when nothing is painted or the canvas is not ready. */
  exportMask: () => ExportedMask | null;
};

export type MaskEditorCanvasProps = {
  imageUrl: string;
  imageAlt: string;
  canvasLabel: string;
  hintId: string;
  editor: UseMaskEditorReturn;
};

export type MaskEditDialogProps = {
  /** The attached image being masked; null keeps the dialog closed. */
  fileId: string | null;
  onClose: () => void;
  onApplied: (sourceFileId: string, maskFileId: string) => void;
};

export type UseMaskEditorDialogParams = {
  fileId: string;
  onClose: () => void;
  onApplied: (sourceFileId: string, maskFileId: string) => void;
};

export type UseMaskEditorDialogReturn = {
  editor: UseMaskEditorReturn;
  imageUrl: string | null;
  imageAlt: string;
  isLoadingImage: boolean;
  imageFailed: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  canApply: boolean;
  onApply: () => void;
  onErase: (erasing: boolean) => void;
  onBrushChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  hintId: string;
  brushId: string;
};

/** The composer's mask state: which image was masked and the uploaded mask's file id. */
export type ComposerMaskState = { sourceFileId: string; maskFileId: string };

export type UseComposerMaskEditParams = {
  selectedFileIds: string[];
  onSelectedFileIdsChange: (fileIds: string[]) => void;
};

export type UseComposerMaskEditReturn = {
  /** The image currently open in the editor, or null. */
  editingFileId: string | null;
  openEditor: (fileId: string) => void;
  closeEditor: () => void;
  mask: ComposerMaskState | null;
  applyMask: (sourceFileId: string, maskFileId: string) => void;
  clearMask: () => void;
  /**
   * The mask to send with these attached files, or undefined. Clears the mask
   * either way: a mask belongs to the one send it was drawn for.
   */
  consumeMaskFor: (fileIds: readonly string[] | undefined) => string | undefined;
};

export type ImageMaskRefusalNoticeProps = { code: ImageMaskRefusalCode };

/** What the attachment tray needs to offer "Mask edit" on an image tile. */
export type ComposerTrayMaskEdit = {
  /** The image that currently carries a drawn mask, or null. */
  maskedFileId: string | null;
  onOpen: (fileId: string) => void;
  onClear: () => void;
};
