import { useRef } from 'react';

export function useMarkdownToolbar(value: string, onChange: (next: string) => void) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wrapSelection = (prefix: string, suffix?: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const effectiveSuffix = suffix ?? prefix;

    const newValue =
      value.substring(0, start) + prefix + selectedText + effectiveSuffix + value.substring(end);

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newStart = start + prefix.length;
      const newEnd = end + prefix.length;
      textarea.setSelectionRange(newStart, newEnd);
    }, 0);
  };

  const applyBold = () => wrapSelection('**', '**');
  const applyItalic = () => wrapSelection('*', '*');
  const applyBulletList = () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const lines = selectedText.split('\n').map((line) => `- ${line}`);
    const newValue = value.substring(0, start) + lines.join('\n') + value.substring(end);
    onChange(newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, end + lines.length * 2);
    }, 0);
  };
  const applyNumberedList = () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const lines = selectedText.split('\n').map((line, index) => `${index + 1}. ${line}`);
    const newValue = value.substring(0, start) + lines.join('\n') + value.substring(end);
    onChange(newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, end + lines.length * 3);
    }, 0);
  };
  const applyHeading = () => wrapSelection('## ', '');
  const applyLink = () => wrapSelection('[', '](url)');
  const applyInlineCode = () => wrapSelection('`', '`');

  return {
    textareaRef,
    applyBold,
    applyItalic,
    applyBulletList,
    applyNumberedList,
    applyHeading,
    applyLink,
    applyInlineCode,
  };
}
