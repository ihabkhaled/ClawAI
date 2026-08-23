'use client';

import { ExternalLink, Loader2 } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HF_CATEGORY_OPTIONS, HF_QUALITY_TIER_OPTIONS } from '@/constants/hf-search.constants';
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
      <div className="border-border text-muted-foreground flex h-96 items-center justify-center rounded-md border border-dashed text-xs">
        Pick a model on the left to see its GGUF files and import.
      </div>
    );
  }
  if (isLoading || !details) {
    return (
      <div className="border-border bg-background/40 flex h-96 items-center justify-center rounded-md border">
        <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
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
    <div className="border-border flex h-96 flex-col gap-3 overflow-y-auto rounded-md border p-3">
      <div>
        <p className="text-foreground text-sm font-medium">{details.id}</p>
        <a
          href={`https://huggingface.co/${details.id}`}
          target="_blank"
          rel="noreferrer"
          className="touch:text-xs text-primary inline-flex items-center gap-1 text-[11px] hover:underline"
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
          <span className="text-foreground truncate">
            {details.recommendedFile
              ? `${details.recommendedFile.name} (${formatHfBytes(
                  details.recommendedFile.sizeBytes,
                )})`
              : 'No recommendation'}
          </span>
        </HfField>
      </div>

      <div>
        <p className="touch:text-xs text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
          GGUF files ({details.ggufFiles.length})
        </p>
        <ul className="touch:text-xs text-muted-foreground mt-1 max-h-32 overflow-y-auto text-[11px]">
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
      <span className="touch:text-xs text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}
