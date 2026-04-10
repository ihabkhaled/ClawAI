import { useCallback, useEffect, useRef, useState } from 'react';

import { COMPOSER_DEFAULT_HEIGHT, COMPOSER_MAX_HEIGHT_RATIO, COMPOSER_MIN_HEIGHT } from '@/constants';
import { logger } from '@/utilities';

export function useResizableComposer() {
  const [composerHeight, setComposerHeight] = useState(COMPOSER_DEFAULT_HEIGHT);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent): void => {
    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY;
    startHeight.current = composerHeight;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    logger.debug({ component: 'chat', action: 'resize-start', message: 'Composer resize started' });
  }, [composerHeight]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (!isDragging.current) {
        return;
      }
      const delta = startY.current - e.clientY;
      const maxHeight = window.innerHeight * COMPOSER_MAX_HEIGHT_RATIO;
      const newHeight = Math.min(maxHeight, Math.max(COMPOSER_MIN_HEIGHT, startHeight.current + delta));
      setComposerHeight(newHeight);
    };

    const handleMouseUp = (): void => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return { composerHeight, handleMouseDown };
}
