import type { MaskEditorCanvasProps } from '@/types/image-mask-editor.types';

/**
 * The source image with the paint layer on top. The canvas is sized to the
 * image's natural pixels by the hook and stretched to the picture by CSS, so a
 * stroke lands under the pointer at any dialog width (360px included).
 * `touch-none` hands the gesture to the canvas instead of scrolling the page.
 * Cursor positions use physical `left`/`top` on purpose: they are coordinates on
 * the picture, which does not mirror in a right-to-left layout.
 */
export function MaskEditorCanvas({
  imageUrl,
  imageAlt,
  canvasLabel,
  hintId,
  editor,
}: MaskEditorCanvasProps): React.ReactElement {
  const cursor = editor.keyboardCursor;

  return (
    <div className="bg-muted/40 flex justify-center overflow-hidden rounded-lg border p-1">
      <div className="relative w-fit max-w-full" dir="ltr">
        <img
          src={imageUrl}
          alt={imageAlt}
          onLoad={editor.onImageLoad}
          draggable={false}
          className="block h-auto max-h-[50dvh] w-auto max-w-full select-none"
          data-testid="mask-editor-image"
        />
        <canvas
          ref={editor.canvasRef}
          tabIndex={0}
          aria-label={canvasLabel}
          aria-describedby={hintId}
          onPointerDown={editor.onPointerDown}
          onPointerMove={editor.onPointerMove}
          onPointerUp={editor.onPointerUp}
          onPointerCancel={editor.onPointerUp}
          onKeyDown={editor.onKeyDown}
          onBlur={editor.onBlur}
          className="focus-visible:ring-ring absolute inset-0 h-full w-full cursor-crosshair touch-none opacity-60 focus-visible:ring-2 focus-visible:outline-none"
          data-testid="mask-editor-canvas"
        />
        {cursor === null ? null : (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
              editor.isKeyboardPainting ? 'border-red-500 bg-red-500/30' : 'border-white'
            }`}
            style={{
              left: `${String(cursor.leftPercent)}%`,
              top: `${String(cursor.topPercent)}%`,
              width: `${String(cursor.diameterPercent)}%`,
            }}
            data-testid="mask-editor-cursor"
          />
        )}
      </div>
    </div>
  );
}
