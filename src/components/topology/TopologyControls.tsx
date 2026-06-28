import type { TopologyKind, TopologyParams } from '../../lib/topology'
import { TOPOLOGY_ORDER, TOPOLOGY_INFO, paramControls } from '../../lib/topologyData'

export interface Highlights {
  diameter: boolean
  bisection: boolean
  degree: boolean
}

interface TopologyControlsProps {
  kind: TopologyKind
  onKind: (k: TopologyKind) => void
  params: TopologyParams
  onParam: (key: keyof TopologyParams, value: number) => void
  highlights: Highlights
  onToggle: (key: keyof Highlights) => void
}

export function TopologyControls({
  kind,
  onKind,
  params,
  onParam,
  highlights,
  onToggle,
}: TopologyControlsProps) {
  const controls = paramControls(kind)
  const toggles: Array<{ key: keyof Highlights; label: string }> = [
    { key: 'diameter', label: 'Диаметр' },
    { key: 'bisection', label: 'Бисекция' },
    { key: 'degree', label: 'Макс. степень' },
  ]

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      {/* Topology tiles */}
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Топология">
        {TOPOLOGY_ORDER.map((id) => {
          const isActive = kind === id
          return (
            <button
              key={id}
              role="radio"
              aria-checked={isActive}
              onClick={() => onKind(id)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-sky-500 bg-sky-500 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {TOPOLOGY_INFO[id].name}
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Size params */}
        <div className="flex flex-col gap-3">
          {controls.map((c) => (
            <label
              key={c.key}
              className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              <span>
                {c.label}: <span className="font-mono">{params[c.key]}</span>
              </span>
              <input
                type="range"
                min={c.min}
                max={c.max}
                value={params[c.key]}
                onChange={(e) => onParam(c.key, parseInt(e.target.value, 10))}
                className="accent-sky-500"
                aria-label={c.label}
              />
            </label>
          ))}
        </div>

        {/* Highlight toggles */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Подсветки</span>
          <div className="flex flex-wrap gap-2">
            {toggles.map((t) => {
              const on = highlights[t.key]
              return (
                <button
                  key={t.key}
                  aria-pressed={on}
                  onClick={() => onToggle(t.key)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    on
                      ? 'border-amber-400 bg-amber-100 text-amber-800 dark:border-amber-400/50 dark:bg-amber-400/15 dark:text-amber-200'
                      : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
                >
                  {on ? '◉' : '◯'} {t.label}
                </button>
              )
            })}
          </div>
          <p className="text-[11px] leading-tight text-slate-400 dark:text-slate-500">
            Наведи/кликни узел — подсветятся его соседи и степень. Диаметр — самый длинный
            кратчайший путь; бисекция — разрез сети пополам.
          </p>
        </div>
      </div>
    </div>
  )
}
