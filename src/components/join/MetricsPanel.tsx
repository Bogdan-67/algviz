import type { JoinMetrics } from '../../lib/join'
import { fragmentColor } from '../fragmentColor'

interface MetricsPanelProps {
  metrics: JoinMetrics
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40">
      <span className="text-[10px] uppercase tracking-wide text-slate-400">{label}</span>
      <span className="font-mono text-lg font-semibold text-slate-800 dark:text-slate-100">{value}</span>
      {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
    </div>
  )
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
  const max = Math.max(1, ...metrics.perExecutor)
  const efficiency =
    metrics.theoreticalMax > 0 ? (metrics.speedup / metrics.theoreticalMax) * 100 : 0

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
        Метрики (у.е. времени)
      </h3>

      {/* Per-executor load bars (parallel = max, the tallest is the bottleneck) */}
      <div className="flex flex-col gap-1.5">
        {metrics.perExecutor.map((t, id) => {
          const color = fragmentColor(id)
          const isBottleneck = id === metrics.bottleneckFragment
          return (
            <div key={id} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
                исполн. {id}
              </span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/50">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(t / max) * 100}%`, background: color.solid }}
                />
              </div>
              <span
                className={`w-10 shrink-0 text-right font-mono text-[11px] tabular-nums ${
                  isBottleneck ? 'font-bold text-rose-600 dark:text-rose-300' : 'text-slate-500'
                }`}
              >
                {t}
              </span>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Параллельно" value={`${metrics.parallelTime}`} hint="= max по исполнителям" />
        <Metric label="Последовательно" value={`${metrics.sequentialTime}`} hint="= сумма (1 исполнитель)" />
        <Metric
          label="Ускорение"
          value={`${metrics.speedup.toFixed(2)}×`}
          hint={`КПД ${efficiency.toFixed(0)}%`}
        />
        <Metric label="Теор. максимум" value={`${metrics.theoreticalMax}×`} hint="= число фрагментов p" />
      </div>

      <p className="text-[11px] leading-tight text-slate-400 dark:text-slate-500">
        Общее (параллельное) время определяет самый нагруженный фрагмент — перекос данных. Ускорение
        = послед. / паралл.; идеал = p, но перекос его снижает.
      </p>
    </div>
  )
}
