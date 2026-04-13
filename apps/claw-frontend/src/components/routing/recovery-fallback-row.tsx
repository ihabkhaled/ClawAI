import type { RecoveryFallbackRowProps } from '@/types';

export function RecoveryFallbackRow({ fallback, t }: RecoveryFallbackRowProps) {
  const formattedTime = new Date(fallback.createdAt).toLocaleString();
  const fallbackProviderDisplay = fallback.fallbackProvider ?? t('common.notAvailable');
  const fallbackModelDisplay = fallback.fallbackModel ?? t('common.notAvailable');

  return (
    <tr className="border-t border-border text-sm">
      <td className="px-4 py-2">{fallback.selectedProvider}</td>
      <td className="px-4 py-2 text-muted-foreground">{fallback.selectedModel}</td>
      <td className="px-4 py-2">{fallbackProviderDisplay}</td>
      <td className="px-4 py-2 text-muted-foreground">{fallbackModelDisplay}</td>
      <td className="px-4 py-2">
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{fallback.routingMode}</span>
      </td>
      <td className="px-4 py-2 text-muted-foreground">{formattedTime}</td>
    </tr>
  );
}
