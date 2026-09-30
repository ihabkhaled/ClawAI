import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MaskBrushMode } from '@/enums/mask-brush-mode.enum';
import { useMaskEditor } from '@/hooks/chat/use-mask-editor';
import type { UseMaskEditorReturn } from '@/types/image-mask-editor.types';

const WIDTH = 4;
const HEIGHT = 2;

/** A recording stand-in for the 2D context, because jsdom ships no canvas. */
function createFakeContext(paintAlphas: number[]) {
  const written: { data: Uint8ClampedArray | null } = { data: null };
  const context = {
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: '',
    lineJoin: '',
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({
      data: Uint8ClampedArray.from(paintAlphas.flatMap((alpha) => [239, 68, 68, alpha])),
    })),
    createImageData: vi.fn((width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    })),
    putImageData: vi.fn((image: { data: Uint8ClampedArray }) => {
      written.data = image.data;
    }),
  };
  return { context, written };
}

let editor: UseMaskEditorReturn;

function Harness(): React.ReactElement {
  editor = useMaskEditor({ imageUrl: 'blob:source' });
  return (
    <div>
      <img alt="source" src="blob:source" onLoad={editor.onImageLoad} />
      <canvas
        ref={editor.canvasRef}
        data-testid="canvas"
        tabIndex={0}
        onPointerDown={editor.onPointerDown}
        onPointerMove={editor.onPointerMove}
        onPointerUp={editor.onPointerUp}
        onKeyDown={editor.onKeyDown}
        onBlur={editor.onBlur}
      />
    </div>
  );
}

const originalGetContext = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  'getContext',
);
const originalToDataUrl = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'toDataURL');

describe('useMaskEditor', () => {
  let fake = createFakeContext([]);

  function mount(paintAlphas: number[]): { canvas: HTMLCanvasElement } {
    fake = createFakeContext(paintAlphas);
    const { container } = render(<Harness />);
    const canvas = container.querySelector('canvas');
    const image = container.querySelector('img');
    if (canvas === null || image === null) {
      throw new Error('harness did not render');
    }
    canvas.getBoundingClientRect = () => new DOMRect(0, 0, 40, 20);
    Object.defineProperty(image, 'naturalWidth', { value: WIDTH });
    Object.defineProperty(image, 'naturalHeight', { value: HEIGHT });
    fireEvent.load(image);
    return { canvas };
  }

  beforeEach(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => fake.context,
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
      configurable: true,
      value: () => 'data:image/png;base64,QUJD',
    });
  });

  afterEach(() => {
    if (originalGetContext !== undefined) {
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', originalGetContext);
    }
    if (originalToDataUrl !== undefined) {
      Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', originalToDataUrl);
    }
  });

  it('sizes the paint layer to the SOURCE image, not to its CSS box', () => {
    const { canvas } = mount([0]);

    expect(canvas.width).toBe(WIDTH);
    expect(canvas.height).toBe(HEIGHT);
    expect(editor.imageSize).toEqual({ width: WIDTH, height: HEIGHT });
  });

  it('paints under the pointer, in image pixels', () => {
    const { canvas } = mount([0]);

    fireEvent.pointerDown(canvas, { clientX: 20, clientY: 10, button: 0, pointerId: 1 });

    expect(fake.context.arc).toHaveBeenCalledWith(2, 1, expect.any(Number), 0, Math.PI * 2);
    expect(fake.context.globalCompositeOperation).toBe('source-over');
    expect(editor.hasPaint).toBe(true);
  });

  it('erases with destination-out instead of painting a second colour', () => {
    const { canvas } = mount([0]);
    act(() => editor.setMode(MaskBrushMode.Erase));

    fireEvent.pointerDown(canvas, { clientX: 20, clientY: 10, button: 0, pointerId: 1 });

    expect(fake.context.globalCompositeOperation).toBe('destination-out');
  });

  it('draws a line while the pointer drags and stops after release', () => {
    const { canvas } = mount([0]);

    fireEvent.pointerDown(canvas, { clientX: 0, clientY: 0, button: 0, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 20, clientY: 10, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 20, clientY: 10, pointerId: 1 });
    const strokesAfterRelease = fake.context.lineTo.mock.calls.length;
    fireEvent.pointerMove(canvas, { clientX: 30, clientY: 10, pointerId: 1 });

    expect(fake.context.lineTo).toHaveBeenCalledWith(2, 1);
    expect(fake.context.lineTo.mock.calls).toHaveLength(strokesAfterRelease);
  });

  it('paints from the keyboard: Space starts, arrows move, Space stops', () => {
    const { canvas } = mount([0]);

    fireEvent.keyDown(canvas, { key: ' ' });
    expect(editor.isKeyboardPainting).toBe(true);
    expect(editor.keyboardCursor).not.toBeNull();

    fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    expect(fake.context.lineTo).toHaveBeenCalled();

    fireEvent.keyDown(canvas, { key: ' ' });
    expect(editor.isKeyboardPainting).toBe(false);
  });

  it('only moves the brush from the keyboard while painting is off', () => {
    const { canvas } = mount([0]);

    fireEvent.keyDown(canvas, { key: 'ArrowRight' });

    expect(fake.context.lineTo).not.toHaveBeenCalled();
    expect(editor.keyboardCursor).not.toBeNull();
  });

  it('exports the backend convention: painted -> alpha 0, unpainted -> opaque, same size', () => {
    mount([255, 0, 0, 0, 0, 0, 0, 0]);

    const exported = editor.exportMask();

    expect(exported).toEqual({ base64: 'QUJD', width: WIDTH, height: HEIGHT, sizeBytes: 3 });
    const alphas = Array.from(fake.written.data ?? []).filter((_, index) => index % 4 === 3);
    expect(alphas).toEqual([0, 255, 255, 255, 255, 255, 255, 255]);
  });

  it('exports nothing when nothing is painted', () => {
    mount([0, 0, 0, 0, 0, 0, 0, 0]);

    expect(editor.exportMask()).toBeNull();
  });

  it('clears the layer', () => {
    const { canvas } = mount([0]);
    fireEvent.pointerDown(canvas, { clientX: 20, clientY: 10, button: 0, pointerId: 1 });

    act(() => editor.clear());

    expect(fake.context.clearRect).toHaveBeenCalledWith(0, 0, WIDTH, HEIGHT);
    expect(editor.hasPaint).toBe(false);
  });
});
