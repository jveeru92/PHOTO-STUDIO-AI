import { AlertTriangle, Info } from 'lucide-react';
import type { ProviderQuota } from '@/types';

export function QuotaBanner({ quota }: { quota: ProviderQuota }) {
  const exhausted = quota.available === false;
  const near = quota.quotaRemaining != null && quota.quotaRemaining <= 5 && quota.quotaRemaining > 0;
  return (
    <div className={`rounded-lg border p-3 text-xs flex items-center gap-2 ${
      exhausted
        ? 'bg-amber-900/20 border-amber-900/30 text-amber-200'
        : near
          ? 'bg-amber-500/10 border-amber-200/50 text-amber-800'
          : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-muted)]'
    }`}>
      {exhausted ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
      <div className="flex-1">
        <div className="font-medium">{quota.name} · {quota.model}</div>
        <div className="mt-0.5">
          {exhausted
            ? 'Free daily quota exhausted. Manual editing still works.'
            : near
              ? `Approaching limit (~${quota.quotaRemaining} remaining, estimated).`
              : `Quota OK${quota.quotaRemaining != null ? ` · ~${quota.quotaRemaining} remaining` : ''}.`}
        </div>
      </div>
    </div>
  );
}
