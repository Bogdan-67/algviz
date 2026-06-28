import { numaExpectedLatency, type MemSnapshot } from '../../lib/memarch'

interface MetricsPanelProps {
  snapshot: MemSnapshot
  locality: number
}

function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40">
      <span className="text-[10px] uppercase tracking-wide text-slate-400">{label}</span>
      <span className={`font-mono text-lg font-semibold ${accent ?? 'text-slate-800 dark:text-slate-100'}`}>
        {value}
      </span>
      {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
    </div>
  )
}

export function MetricsPanel({ snapshot, locality }: MetricsPanelProps) {
  const isUma = snapshot.arch === 'uma'
  const localPct = snapshot.count > 0 ? (snapshot.localCount / snapshot.count) * 100 : 0

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
        Метрики (модельные единицы)
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Обращений" value={`${snapshot.count}`} />
        <Stat
          label="Средняя задержка"
          value={snapshot.avgLatency.toFixed(2)}
          accent="text-sky-600 dark:text-sky-300"
        />
        {isUma ? (
          <>
            <Stat
              label="Ожидание шины (тек.)"
              value={`+${snapshot.busBusy}`}
              hint="конкуренция за общую шину"
              accent={snapshot.busBusy > 0 ? 'text-amber-600 dark:text-amber-300' : undefined}
            />
            <Stat label="Узкое место" value="шина" hint="растёт с числом p" />
          </>
        ) : (
          <>
            <Stat
              label="Локальные / удалённые"
              value={`${snapshot.localCount}/${snapshot.remoteCount}`}
              hint={`${localPct.toFixed(0)}% локальных`}
              accent="text-emerald-600 dark:text-emerald-300"
            />
            <Stat
              label="Ожидаемая (по локальности)"
              value={numaExpectedLatency(locality).toFixed(2)}
              hint={`locality = ${(locality * 100).toFixed(0)}%`}
            />
          </>
        )}
      </div>
      {!isUma && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[12px] leading-snug text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          Больше локальных обращений → ниже средняя задержка. Политика first-touch размещает
          страницу в памяти того узла, который первым к ней обратился.
        </p>
      )}
    </div>
  )
}
