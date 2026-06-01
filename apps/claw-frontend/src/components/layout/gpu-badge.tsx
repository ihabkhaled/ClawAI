'use client';

import { Cpu, Zap } from 'lucide-react';
import Link from 'next/link';

import { ROUTES } from '@/constants';
import { useGpuBadge } from '@/hooks/layout/use-gpu-badge';
import { useTranslation } from '@/lib/i18n';

export function GpuBadge(): React.ReactElement | null {
  const data = useGpuBadge();
  const { t } = useTranslation();

  if (!data.canView) {
    // ADMIN_SYSTEM_VIEW gates the runtime/hardware diagnostics pill — non-admin
    // users without the permission never see GPU/CPU info in the sidebar.
    return null;
  }

  if (!data.hasGpu) {
    // No-GPU pill keeps the neutral muted treatment — gradient border is the
    // reward for actually having a detected accelerator.
    return (
      <Link
        data-testid="sidebar-gpu-pill"
        href={ROUTES.MODELS_LOCAL_FRONTIER}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted"
        title={t('gpuBadge.noGpu')}
      >
        <Cpu className="size-3" aria-hidden />
        <span>{t('gpuBadge.cpuOnly')}</span>
      </Link>
    );
  }

  const vendorLabel = t(`gpuBadge.vendor.${data.vendor}` as `gpuBadge.vendor.nvidia`);
  const summary = data.vramGb ? `${vendorLabel} · ${data.vramGb} GB` : vendorLabel;

  // Gradient-border pill (uses .gradient-border-pill helper backed by
  // --gradient-brand). The Zap glyph and label tint use the primary token so
  // the pill reads as "GPU active" without the previous hard-coded emerald.
  return (
    <Link
      data-testid="sidebar-gpu-pill"
      href={ROUTES.MODELS_LOCAL_FRONTIER}
      className="gradient-border-pill inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold text-primary transition-transform duration-fast ease-expo-out hover:scale-[1.02]"
      title={data.model ?? vendorLabel}
    >
      <Zap className="size-3" aria-hidden />
      <span className="max-w-[140px] truncate">{summary}</span>
    </Link>
  );
}
