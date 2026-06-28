import type { TopologyKind } from '../../lib/topology'
import { TOPOLOGY_INFO } from '../../lib/topologyData'

interface UseCaseListProps {
  kind: TopologyKind
  onOpenCannon?: () => void
}

export function UseCaseList({ kind, onOpenCannon }: UseCaseListProps) {
  const info = TOPOLOGY_INFO[kind]
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
        Для чего хороша: {info.name}
      </h3>
      <p className="text-[12px] text-slate-500 dark:text-slate-400">{info.blurb}</p>

      <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
        Применения
      </span>
      <ul className="flex flex-col gap-1">
        {info.useCases.map((u, i) => (
          <li key={i} className="flex gap-1.5 text-[12px] text-slate-600 dark:text-slate-300">
            <span className="text-emerald-500">▸</span>
            <span>{u}</span>
          </li>
        ))}
      </ul>

      <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-rose-500 dark:text-rose-400">
        Слабые стороны
      </span>
      <ul className="flex flex-col gap-1">
        {info.weaknesses.map((w, i) => (
          <li key={i} className="flex gap-1.5 text-[12px] text-slate-600 dark:text-slate-300">
            <span className="text-rose-400">▾</span>
            <span>{w}</span>
          </li>
        ))}
      </ul>

      {info.linkCannon && onOpenCannon && (
        <button
          onClick={onOpenCannon}
          className="mt-2 self-start rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-100 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300"
        >
          → Живой пример: умножение по Кэннону (тор со сдвигами)
        </button>
      )}
    </div>
  )
}
