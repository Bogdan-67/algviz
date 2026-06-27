import { MIN_N, MAX_N, FULL_ANIM_MAX } from '../lib/constants'

interface ControlsProps {
  n: number
  onNChange: (n: number) => void
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
  rangeMin: number
  rangeMax: number
  onRangeChange: (min: number, max: number) => void
  onRandom: () => void
  theme: 'dark' | 'light'
  onThemeToggle: () => void
}

const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'

const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors bg-slate-900 text-white hover:bg-slate-700 dark:bg-sky-500 dark:hover:bg-sky-400'

export function Controls({
  n,
  onNChange,
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
  rangeMin,
  rangeMax,
  onRangeChange,
  onRandom,
  theme,
  onThemeToggle,
}: ControlsProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      {/* Step transport */}
      <div className="flex flex-wrap items-center gap-2">
        <button className={btn} onClick={onPrev} disabled={atStart} aria-label="Назад (стрелка влево)">
          ← Назад
        </button>
        <button className={btnPrimary} onClick={onPlayToggle} aria-label="Воспроизведение или пауза (пробел)">
          {isPlaying ? '⏸ Пауза' : '▶ Авто'}
        </button>
        <button className={btn} onClick={onNext} disabled={atEnd} aria-label="Дальше (стрелка вправо)">
          Дальше →
        </button>
        <button className={btn} onClick={onReset} aria-label="Сброс на первый шаг">
          ↺ Сброс
        </button>
        <span className="ml-auto font-mono text-xs text-slate-500 dark:text-slate-400">
          {stepIndex} / {totalSteps - 1}
        </span>
      </div>

      {/* Sliders */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>
            Размер N = <span className="font-mono">{n}</span>
            <span className="text-slate-400"> (полная анимация до {FULL_ANIM_MAX})</span>
          </span>
          <input
            type="range"
            min={MIN_N}
            max={MAX_N}
            value={n}
            onChange={(e) => onNChange(parseInt(e.target.value, 10))}
            className="accent-sky-500"
            aria-label="Размер матриц N"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>
            Скорость авто: <span className="font-mono">{(speedMs / 1000).toFixed(2)} с</span>/шаг
          </span>
          <input
            type="range"
            min={200}
            max={2500}
            step={100}
            // Invert so dragging right = faster.
            value={2700 - speedMs}
            onChange={(e) => onSpeedChange(2700 - parseInt(e.target.value, 10))}
            className="accent-sky-500"
            aria-label="Скорость анимации"
          />
        </label>
      </div>

      {/* Data generation */}
      <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3 dark:border-slate-700/60">
        <button className={btn} onClick={onRandom} aria-label="Сгенерировать случайные данные">
          🎲 Случайные данные
        </button>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          мин
          <input
            type="number"
            value={rangeMin}
            onChange={(e) => onRangeChange(parseInt(e.target.value, 10) || 0, rangeMax)}
            className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 font-mono dark:border-slate-600 dark:bg-slate-800"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          макс
          <input
            type="number"
            value={rangeMax}
            onChange={(e) => onRangeChange(rangeMin, parseInt(e.target.value, 10) || 0)}
            className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 font-mono dark:border-slate-600 dark:bg-slate-800"
          />
        </label>
        <button className={`${btn} ml-auto`} onClick={onThemeToggle} aria-label="Переключить тему">
          {theme === 'dark' ? '☀ Светлая' : '🌙 Тёмная'}
        </button>
      </div>
    </div>
  )
}
