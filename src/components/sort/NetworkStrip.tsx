import type { Snapshot } from '../../lib/sort'

interface NetworkStripProps {
  snapshots: Snapshot[]
  currentIndex: number
  onSelect: (index: number) => void
}

export function NetworkStrip({ snapshots, currentIndex, onSelect }: NetworkStripProps) {
  const isBitonic = snapshots[0]?.kind === 'bitonic'
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
          Сеть сравнений / фазы
        </h3>
        {isBitonic && (
          <span className="text-[11px] text-slate-400">
            <span className="text-sky-500">▲</span> по возрастанию ·{' '}
            <span className="text-violet-500">▼</span> по убыванию · сеть фиксирована
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {snapshots.map((s) => {
          const isCurrent = s.index === currentIndex
          const up = s.pairs.filter((p) => p.ascending).length
          const down = s.pairs.length - up
          const label =
            s.index === 0
              ? 'вход'
              : isBitonic
                ? `${s.stage}.${s.substage}`
                : `${s.phase}`
          return (
            <button
              key={s.index}
              onClick={() => onSelect(s.index)}
              title={s.caption}
              className={`flex min-w-[34px] flex-col items-center rounded-md border px-1.5 py-1 text-[10px] transition-colors ${
                isCurrent
                  ? 'border-sky-500 bg-sky-500 text-white'
                  : s.sorted && s.index > 0
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <span className="font-mono font-semibold">{label}</span>
              {isBitonic && s.index > 0 && (
                <span className="leading-none">
                  <span className="text-sky-300">{up ? `▲${up}` : ''}</span>
                  <span className="text-violet-300">{down ? ` ▼${down}` : ''}</span>
                </span>
              )}
              {!isBitonic && s.index > 0 && (
                <span className="leading-none text-[9px] opacity-80">{s.pairs.length}п</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
