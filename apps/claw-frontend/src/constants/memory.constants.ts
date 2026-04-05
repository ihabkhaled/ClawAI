import { ContextPackItemType, FileIngestionStatus, MemoryFilterValue, MemoryType } from '@/enums';

export const MEMORY_TYPE_OPTIONS = Object.values(MemoryType);

export const CONTEXT_PACK_ITEM_TYPE_OPTIONS = Object.values(ContextPackItemType);

export const MEMORY_TYPE_LABELS: Record<MemoryType, string> = {
  [MemoryType.SUMMARY]: 'Summary',
  [MemoryType.FACT]: 'Fact',
  [MemoryType.PREFERENCE]: 'Preference',
  [MemoryType.INSTRUCTION]: 'Instruction',
};

export const MEMORY_FILTER_OPTIONS = [
  { value: MemoryFilterValue.ALL, label: 'All Types' },
  ...Object.values(MemoryType).map((t) => ({
    value: t,
    label: MEMORY_TYPE_LABELS[t],
  })),
];

export const MEMORY_TYPE_COLORS: Record<MemoryType, string> = {
  [MemoryType.SUMMARY]:
    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  [MemoryType.FACT]:
    'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  [MemoryType.PREFERENCE]:
    'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800',
  [MemoryType.INSTRUCTION]:
    'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
};

export const INGESTION_STATUS_LABELS: Record<FileIngestionStatus, string> = {
  [FileIngestionStatus.PENDING]: 'Pending',
  [FileIngestionStatus.PROCESSING]: 'Processing',
  [FileIngestionStatus.COMPLETED]: 'Completed',
  [FileIngestionStatus.FAILED]: 'Failed',
};

export const INGESTION_STATUS_COLORS: Record<FileIngestionStatus, string> = {
  [FileIngestionStatus.PENDING]:
    'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  [FileIngestionStatus.PROCESSING]:
    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  [FileIngestionStatus.COMPLETED]:
    'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  [FileIngestionStatus.FAILED]:
    'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
};

export const CONTEXT_PACK_ITEM_TYPE_LABELS: Record<ContextPackItemType, string> = {
  [ContextPackItemType.NOTE]: 'Text Note',
  [ContextPackItemType.INSTRUCTION]: 'Instruction',
  [ContextPackItemType.FILE_REFERENCE]: 'File Reference',
};
