'use client';

import { ExternalLink, Loader2 } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  HF_CATEGORY_OPTIONS,
  HF_QUALITY_TIER_OPTIONS,
} from '@/constants/hf-search.constants';
import type { HfCategoryChoice, HfQualityTierChoice } from '@/enums/hf-search.enum';
import type { HfDetailsPanelProps, HfFieldProps } from '@/types/hf-search.types';
import { formatHfBytes } from '@/utilities/hf-format.utility';

export function HfDetailsPanel({
  details,
  isLoading,
  selectedRepo,
  quantization,
  setQuantization,
  category,
  setCategory,
  qualityTier,
  setQualityTier,
}: HfDetailsPanelProps): React.ReactElement {
  if (!selectedRepo) {
    return (
      <div className="flex h-96 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
        Pick a model on the left to see its GGUF files and import.
      </div>
    );
  }
  if (isLoading || !details) {
    return (
      <div className="flex h-96 items-center justify-center rounded-md border border-border bg-background/40">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }
  const quantOptions = Array.from(
    new Set(
      details.ggufFiles
        .map((file) => file.quantization)
        .filter((value): value is string => value !== null),
    ),
  );
  return (
    <div className="flex h-96 flex-col gap-3 overflow-y-auto rounded-md border border-border p-3">
      <div>
        <p className="text-sm font-medium text-foreground">{details.id}</p>
        <a
          href={`https://huggingface.co/${details.id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          View on HuggingFace
          <ExternalLink className="size-3" aria-hidden />
        </a>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <HfField label="Quantization">
          <Select value={quantization} onValueChange={setQuantization}>
            <SelectTrigger>
              <SelectValue placeholder="Quant" />
            </SelectTrigger>
            <SelectContent>
              {quantOptions.length === 0 ? (
                <SelectItem value={quantization}>{quantization}</SelectItem>
              ) : (
                quantOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </HfField>
        <HfField label="Category">
          <Select
            value={category}
            onValueChange={(value) => setCategory(value as HfCategoryChoice)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {HF_CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </HfField>
        <HfField label="Quality tier">
          <Select
            value={qualityTier}
            onValueChange={(value) => setQualityTier(value as HfQualityTierChoice)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Quality tier" />
            </SelectTrigger>
            <SelectContent>
              {HF_QUALITY_TIER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </HfField>
        <HfField label="Recommended file">
          <span className="truncate text-foreground">
            {details.recommendedFile
              ? `${details.recommendedFile.name} (${formatHfBytes(
                  details.recommendedFile.sizeBytes,
                )})`
              : 'No recommendation'}
          </span>
        </HfField>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          GGUF files ({details.ggufFiles.length})
        </p>
        <ul className="mt-1 max-h-32 overflow-y-auto text-[11px] text-muted-foreground">
          {details.ggufFiles.map((file) => (
            <li key={file.name} className="flex items-center justify-between gap-2">
              <span className="truncate">{file.name}</span>
              <span className="shrink-0 tabular-nums">{formatHfBytes(file.sizeBytes)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function HfField({ label, children }: HfFieldProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}
