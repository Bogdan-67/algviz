import type { Arch } from '../../lib/memarch'

interface MemoryControlsProps {
  arch: Arch
  onArch: (a: Arch) => void
  p: number
  onP: (p: number) => void
  locality: number
  onLocality: (l: number) => void
  count: number
  onCount: (c: number) => void
  busLoad: boolean
  onBusLoad: (v: boolean) => void
  onGenerate: () => void
  stepIndex: number
  totalSteps: number
  isPlaying: boolean
  atStart: boolean
  atEnd: boolean
  onPrev: () => void
  onNext: () => void
  onPlayToggle: () => void
  onReset: () => void
  speedMs: number
  onSpeedChange: (ms: number) => void
}

const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors bg-slate-900 text-white hover:bg-slate-700 dark:bg-sky-500 dark:hover:bg-sky-400'

export function MemoryControls(props: MemoryControlsProps) {
  const {
    arch, onArch, p, onP, locality, onLocality, count, onCount, busLoad, onBusLoad, onGenerate,
    stepIndex, totalSteps, isPlaying, atStart, atEnd, onPrev, onNext, onPlayToggle, onReset,
    speedMs, onSpeedChange,
  } = props
  const isNuma = arch === 'numa'

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5" role="radiogroup" aria-label="Архитектура">
          {(['uma', 'numa'] as Arch[]).map((a) => (
            <button
              key={a}
              role="radio"
              aria-checked={arch === a}
              onClick={() => onArch(a)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                arch === a
                  ? 'border-sky-500 bg-sky-500 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {a === 'uma' ? 'UMA (SMP)' : 'NUMA'}
            </button>
          ))}
        </div>
        <button className={btnPrimary} onClick={onGenerate}>
          🎲 Сгенерировать обращения
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>{isNuma ? 'Узлов' : 'Процессоров'} p = <span className="font-mono">{p}</span></span>
          <input type="range" min={2} max={8} value={p} onChange={(e) => onP(parseInt(e.target.value, 10))} className="accent-sky-500" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>Обращений = <span className="font-mono">{count}</span></span>
          <input type="range" min={4} max={40} value={count} onChange={(e) => onCount(parseInt(e.target.value, 10))} className="accent-sky-500" />
        </label>
        {isNuma ? (
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span>Локальность = <span className="font-mono">{(locality * 100).toFixed(0)}%</span></span>
            <input type="range" min={0} max={1} step={0.05} value={locality} onChange={(e) => onLocality(parseFloat(e.target.value))} className="accent-emerald-500" />
          </label>
        ) : (
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={busLoad} onChange={(e) => onBusLoad(e.target.checked)} className="accent-amber-500" />
            нагрузка на шину (конкуренция)
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>Скорость</span>
          <input type="range" min={150} max={1500} step={50} value={1650 - speedMs} onChange={(e) => onSpeedChange(1650 - parseInt(e.target.value, 10))} className="accent-sky-500" />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-700/60">
        <button className={btn} onClick={onPrev} disabled={atStart}>← Назад</button>
        <button className={btnPrimary} onClick={onPlayToggle}>{isPlaying ? '⏸ Пауза' : '▶ Авто'}</button>
        <button className={btn} onClick={onNext} disabled={atEnd}>Дальше →</button>
        <button className={btn} onClick={onReset}>↺ Сброс</button>
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          обращение {stepIndex} / {totalSteps - 1}
        </span>
      </div>
    </div>
  )
}
