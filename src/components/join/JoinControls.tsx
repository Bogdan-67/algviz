import type { JoinMethod } from '../../lib/join'
import { methodLabel } from '../../lib/join'

interface JoinControlsProps {
  n: number
  onNChange: (n: number) => void
  p: number
  onPChange: (p: number) => void
  skew: number
  onSkewChange: (s: number) => void
  method: JoinMethod
  onMethodChange: (m: JoinMethod) => void
  onRandom: () => void
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

const MIN_N = 4
const MAX_N = 20
const MIN_P = 1
const MAX_P = 4

const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors bg-slate-900 text-white hover:bg-slate-700 dark:bg-sky-500 dark:hover:bg-sky-400'

const METHODS: JoinMethod[] = ['sp', 'scoop', 'rbar']

export function JoinControls(props: JoinControlsProps) {
  const {
    n,
    onNChange,
    p,
    onPChange,
    skew,
    onSkewChange,
    method,
    onMethodChange,
    onRandom,
    stepIndex,
    totalSteps,
    isPlaying,
    atStart,
    atEnd,
    onPrev,
    onNext,
    onPlayToggle,
    onReset,
    speedMs,
    onSpeedChange,
  } = props

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      {/* Method switch */}
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Метод соединения">
        {METHODS.map((m) => {
          const isActive = method === m
          return (
            <button
              key={m}
              role="radio"
              aria-checked={isActive}
              onClick={() => onMethodChange(m)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-sky-500 bg-sky-500 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {methodLabel[m]}
            </button>
          )
        })}
      </div>

      {/* Transport */}
      <div className="flex flex-wrap items-center gap-2">
        <button className={btn} onClick={onPrev} disabled={atStart} aria-label="Назад">
          ← Назад
        </button>
        <button className={btnPrimary} onClick={onPlayToggle} aria-label="Авто или пауза">
          {isPlaying ? '⏸ Пауза' : '▶ Авто'}
        </button>
        <button className={btn} onClick={onNext} disabled={atEnd} aria-label="Дальше">
          Дальше →
        </button>
        <button className={btn} onClick={onReset} aria-label="Сброс">
          ↺ Сброс
        </button>
        <span className="ml-auto font-mono text-xs text-slate-500 dark:text-slate-400">
          {stepIndex} / {totalSteps - 1}
        </span>
      </div>

      {/* Sliders */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>
            Фрагментов p = <span className="font-mono">{p}</span>
          </span>
          <input
            type="range"
            min={MIN_P}
            max={MAX_P}
            value={p}
            onChange={(e) => onPChange(parseInt(e.target.value, 10))}
            className="accent-sky-500"
            aria-label="Число фрагментов"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>
            Строк N ≈ <span className="font-mono">{n}</span> ключей
          </span>
          <input
            type="range"
            min={MIN_N}
            max={MAX_N}
            value={n}
            onChange={(e) => onNChange(parseInt(e.target.value, 10))}
            className="accent-sky-500"
            aria-label="Число строк"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>
            Перекос (skew) <span className="font-mono">{skew.toFixed(1)}</span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={skew}
            onChange={(e) => onSkewChange(parseFloat(e.target.value))}
            className="accent-sky-500"
            aria-label="Перекос данных"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>
            Скорость <span className="font-mono">{(speedMs / 1000).toFixed(2)} с</span>
          </span>
          <input
            type="range"
            min={150}
            max={1800}
            step={50}
            value={1950 - speedMs}
            onChange={(e) => onSpeedChange(1950 - parseInt(e.target.value, 10))}
            className="accent-sky-500"
            aria-label="Скорость анимации"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 dark:border-slate-700/60">
        <button className={btn} onClick={onRandom} aria-label="Случайные данные">
          🎲 Случайные данные
        </button>
        <span className="text-[11px] text-slate-400">
          перекос &gt; 0 → один фрагмент получает больше ключей (несбалансированная нагрузка)
        </span>
      </div>
    </div>
  )
}
