import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  MASK_BRUSH_DEFAULT_PERCENT,
  MASK_FULL_PERCENT,
  MASK_KEYBOARD_TOGGLE_KEYS,
  MASK_MIME_TYPE,
  MASK_PAINT_COLOR,
} from '@/constants/image-mask-editor.constants';
import { MaskBrushMode } from '@/enums/mask-brush-mode.enum';
import type {
  ExportedMask,
  ImagePoint,
  ImageSize,
  UseMaskEditorParams,
  UseMaskEditorReturn,
} from '@/types/image-mask-editor.types';
import {
  base64ByteLength,
  brushDiameterPx,
  clientPointToImagePoint,
  dataUrlToBase64,
  hasPaintedPixels,
  imageCentre,
  moveKeyboardCursor,
  paintLayerToMaskPixels,
} from '@/utilities/image-mask-canvas.utility';

/**
 * The inpainting canvas: draws the brush strokes (pointer, touch and keyboard)
 * on a layer the size of the SOURCE image and exports it as the backend's mask.
 *
 * The canvas IS the paint layer. It is sized to the image's natural pixels and
 * scaled by CSS, so the mask is exactly the source's width x height whatever
 * the dialog's size. Erase uses `destination-out`, which takes paint back
 * rather than painting a second colour.
 */
export function useMaskEditor({ imageUrl }: UseMaskEditorParams): UseMaskEditorReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<ImagePoint | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [brushPercent, setBrushPercent] = useState(MASK_BRUSH_DEFAULT_PERCENT);
  const [mode, setMode] = useState<MaskBrushMode>(MaskBrushMode.Paint);
  const [hasPaint, setHasPaint] = useState(false);
  const [keyboardPoint, setKeyboardPoint] = useState<ImagePoint | null>(null);
  const [isKeyboardPainting, setIsKeyboardPainting] = useState(false);

  // A different source image starts from a blank layer.
  useEffect(() => {
    setImageSize(null);
    setHasPaint(false);
    setKeyboardPoint(null);
    setIsKeyboardPainting(false);
  }, [imageUrl]);

  const getContext = useCallback((): {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
  } | null => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d') ?? null;
    return canvas === null || context === null ? null : { canvas, context };
  }, []);

  const stroke = useCallback(
    (from: ImagePoint, to: ImagePoint): void => {
      const surface = getContext();
      if (surface === null) {
        return;
      }
      const { canvas, context } = surface;
      const diameter = brushDiameterPx(brushPercent, {
        width: canvas.width,
        height: canvas.height,
      });
      context.globalCompositeOperation =
        mode === MaskBrushMode.Erase ? 'destination-out' : 'source-over';
      context.fillStyle = MASK_PAINT_COLOR;
      context.strokeStyle = MASK_PAINT_COLOR;
      context.lineWidth = diameter;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.beginPath();
      context.arc(to.x, to.y, diameter / 2, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    },
    [brushPercent, getContext, mode],
  );

  const refreshHasPaint = useCallback((): void => {
    const surface = getContext();
    if (surface === null || surface.canvas.width === 0 || surface.canvas.height === 0) {
      setHasPaint(false);
      return;
    }
    const { canvas, context } = surface;
    setHasPaint(hasPaintedPixels(context.getImageData(0, 0, canvas.width, canvas.height).data));
  }, [getContext]);

  const pointFor = useCallback((event: React.PointerEvent<HTMLCanvasElement>): ImagePoint => {
    const canvas = event.currentTarget;
    return clientPointToImagePoint(event, canvas.getBoundingClientRect(), {
      width: canvas.width,
      height: canvas.height,
    });
  }, []);

  const onImageLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>): void => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    const canvas = canvasRef.current;
    if (canvas !== null) {
      canvas.width = naturalWidth;
      canvas.height = naturalHeight;
    }
    setImageSize({ width: naturalWidth, height: naturalHeight });
    setHasPaint(false);
    setKeyboardPoint(null);
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): void => {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }
      event.preventDefault();
      if (typeof event.currentTarget.setPointerCapture === 'function') {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      const point = pointFor(event);
      drawingRef.current = true;
      lastPointRef.current = point;
      stroke(point, point);
      if (mode === MaskBrushMode.Paint) {
        setHasPaint(true);
      }
    },
    [mode, pointFor, stroke],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): void => {
      const last = lastPointRef.current;
      if (!drawingRef.current || last === null) {
        return;
      }
      const point = pointFor(event);
      stroke(last, point);
      lastPointRef.current = point;
    },
    [pointFor, stroke],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): void => {
      if (!drawingRef.current) {
        return;
      }
      drawingRef.current = false;
      lastPointRef.current = null;
      if (typeof event.currentTarget.releasePointerCapture === 'function') {
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          // The browser already released the capture (pointercancel): nothing to undo.
        }
      }
      refreshHasPaint();
    },
    [refreshHasPaint],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLCanvasElement>): void => {
      if (imageSize === null) {
        return;
      }
      if (MASK_KEYBOARD_TOGGLE_KEYS.includes(event.key)) {
        event.preventDefault();
        const start = keyboardPoint ?? imageCentre(imageSize);
        setKeyboardPoint(start);
        const next = !isKeyboardPainting;
        setIsKeyboardPainting(next);
        if (next) {
          stroke(start, start);
          if (mode === MaskBrushMode.Paint) {
            setHasPaint(true);
          }
        } else {
          refreshHasPaint();
        }
        return;
      }
      const from = keyboardPoint ?? imageCentre(imageSize);
      const to = moveKeyboardCursor(from, event.key, imageSize, event.shiftKey);
      if (to === null) {
        return;
      }
      event.preventDefault();
      setKeyboardPoint(to);
      if (isKeyboardPainting) {
        stroke(from, to);
        if (mode === MaskBrushMode.Paint) {
          setHasPaint(true);
        }
      }
    },
    [imageSize, isKeyboardPainting, keyboardPoint, mode, refreshHasPaint, stroke],
  );

  const onBlur = useCallback((): void => {
    if (isKeyboardPainting) {
      setIsKeyboardPainting(false);
      refreshHasPaint();
    }
  }, [isKeyboardPainting, refreshHasPaint]);

  const clear = useCallback((): void => {
    const surface = getContext();
    if (surface !== null) {
      surface.context.clearRect(0, 0, surface.canvas.width, surface.canvas.height);
    }
    setHasPaint(false);
    setIsKeyboardPainting(false);
  }, [getContext]);

  const exportMask = useCallback((): ExportedMask | null => {
    const surface = getContext();
    if (surface === null) {
      return null;
    }
    const { canvas, context } = surface;
    const { width, height } = canvas;
    if (width === 0 || height === 0) {
      return null;
    }
    const paint = context.getImageData(0, 0, width, height).data;
    if (!hasPaintedPixels(paint)) {
      return null;
    }
    const output = document.createElement('canvas');
    output.width = width;
    output.height = height;
    const outputContext = output.getContext('2d');
    if (outputContext === null) {
      return null;
    }
    const image = outputContext.createImageData(width, height);
    image.data.set(paintLayerToMaskPixels(paint));
    outputContext.putImageData(image, 0, 0);
    const base64 = dataUrlToBase64(output.toDataURL(MASK_MIME_TYPE));
    if (base64.length === 0) {
      return null;
    }
    return { base64, width, height, sizeBytes: base64ByteLength(base64) };
  }, [getContext]);

  const keyboardCursor = useMemo(() => {
    if (imageSize === null || keyboardPoint === null) {
      return null;
    }
    return {
      leftPercent: (keyboardPoint.x / imageSize.width) * MASK_FULL_PERCENT,
      topPercent: (keyboardPoint.y / imageSize.height) * MASK_FULL_PERCENT,
      diameterPercent:
        (brushDiameterPx(brushPercent, imageSize) / imageSize.width) * MASK_FULL_PERCENT,
    };
  }, [brushPercent, imageSize, keyboardPoint]);

  return {
    imageSize,
    brushPercent,
    setBrushPercent,
    mode,
    setMode,
    hasPaint,
    keyboardCursor,
    isKeyboardPainting,
    canvasRef,
    onImageLoad,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onKeyDown,
    onBlur,
    clear,
    exportMask,
  };
}
