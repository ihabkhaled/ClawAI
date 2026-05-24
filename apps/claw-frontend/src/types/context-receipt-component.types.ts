import type { ContextReceipt, RetrievalBundle } from './context-receipt.types';

export type ContextReceiptButtonProps = {
  messageId: string;
};

export type ContextReceiptPopoverProps = {
  receipt: ContextReceipt | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
};

export type PreviewContextButtonProps = {
  threadId: string;
  draft: string;
};

export type PreviewContextPopoverProps = {
  bundle: RetrievalBundle | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
};
