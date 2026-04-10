import { useToggle } from '@/hooks/common/use-toggle';
import type { UseImageErrorStateReturn } from '@/types';

export const useImageErrorState = (): UseImageErrorStateReturn => {
  const { isOpen: isPickerOpen, toggle: togglePicker, close: closePicker } = useToggle(false);

  return {
    isPickerOpen,
    togglePicker,
    closePicker,
  };
};
