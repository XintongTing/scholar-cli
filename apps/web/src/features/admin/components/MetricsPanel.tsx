import { BarChart2 } from 'lucide-react';
import { useMetrics } from '../hooks/usePromptAdmin';
import { Spinner } from '../../../shared/components/Spinner';

interface MetricsPanelProps {
  nodeId: string;
}

export function MetricsPanel({ nodeId }: MetricsPanelProps) {
  const { data: metrics, isLoading } = useMetrics(nodeId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-16">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide flex items-center gap-1">
        <BarChart2 size={12} strokeWidth={1.5} />
        使用统计
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md border border-border bg-bg-subtle p-3">
          <p className="text-xs text-text-tertiary">调用次数</p>
          <p className="text-xl font-semibold text-text-primary mt-1">
            {metrics?.callCount.toLocaleString() ?? '—'}
          </p>
        </div>
        <div className="rounded-md border border-border bg-bg-subtle p-3">
          <p className="text-xs text-text-tertiary">平均 Token</p>
          <p className="text-xl font-semibold text-text-primary mt-1">
            {metrics ? Math.round(metrics.avgTokens).toLocaleString() : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
