import type { SortMetrics as Metrics, Snapshot } from '../../lib/sort'

interface SortMetricsProps {
  metrics: Metrics
  current: Snapshot
  showContrast: boolean
  onToggleContrast: () => void
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40">
      <span className="text-[10px] uppercase tracking-wide text-slate-400">{label}</span>
      <span className="font-mono text-lg font-semibold text-slate-800 dark:text-slate-100">{value}</span>
      {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
    </div>
  )
}

export function SortMetrics({ metrics, current, showContrast, onToggleContrast }: SortMetricsProps) {
  const parallelNow = current.pairs.length
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
          Метрики
        </h3>
        <span
          role="status"
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            current.sorted
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
          }`}
        >
          {current.sorted ? '✓ отсортировано' : 'сортировка идёт…'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Фаз (паралл. тактов)" value={`${metrics.phases}`} hint="параллельное время" />
        <Stat label="Всего compare-exchange" value={`${metrics.totalCompareExchanges}`} hint="послед. время" />
        <Stat label="Параллельно сейчас" value={`${parallelNow}`} hint="пар на текущей фазе" />
        <Stat label="Ускорение" value={`${metrics.speedup.toFixed(2)}×`} hint="послед. / паралл." />
      </div>

      <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
        <input type="checkbox" checked={showContrast} onChange={onToggleContrast} className="accent-sky-500" />
        Показать контраст «параллельно против последовательно»
      </label>

      {showContrast && (
        <div className="flex flex-col gap-1.5 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-[11px] text-slate-500">параллельно</span>
            <div className="flex flex-wrap gap-0.5">
              {Array.from({ length: Math.max(1, parallelNow) }, (_, i) => (
                <span key={i} className="h-3 w-3 rounded-sm bg-sky-500" />
              ))}
            </div>
            <span className="ml-auto font-mono text-[11px] text-slate-500">1 такт</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-[11px] text-slate-500">последовательно</span>
            <div className="flex flex-wrap gap-0.5">
              {Array.from({ length: Math.max(1, parallelNow) }, (_, i) => (
                <span key={i} className="h-3 w-3 rounded-sm bg-slate-400 dark:bg-slate-500" />
              ))}
            </div>
            <span className="ml-auto font-mono text-[11px] text-slate-500">{parallelNow} тактов</span>
          </div>
          <p className="text-[11px] leading-tight text-slate-400">
            На этой фазе {parallelNow} compare-exchange идут за один параллельный такт; последовательно
            это {parallelNow} тактов. Отсюда ускорение и малое число шагов.
          </p>
        </div>
      )}
    </div>
  )
}
