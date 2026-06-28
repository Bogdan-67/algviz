interface Preset {
  label: string
  onClick: () => void
}

interface SyncControlsProps {
  stepIndex: number
  totalSteps: number
  isPlaying: boolean
  atStart: boolean
  canAdvance: boolean
  onPrev: () => void
  onForward: () => void
  onRandomStep: () => void
  onPlayToggle: () => void
  onReset: () => void
  speedMs: number
  onSpeedChange: (ms: number) => void
  presets: Preset[]
}

const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors bg-slate-900 text-white hover:bg-slate-700 dark:bg-sky-500 dark:hover:bg-sky-400'
const chip =
  'rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-100 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300'

export function SyncControls({
  stepIndex,
  totalSteps,
  isPlaying,
  atStart,
  canAdvance,
  onPrev,
  onForward,
  onRandomStep,
  onPlayToggle,
  onReset,
  speedMs,
  onSpeedChange,
  presets,
}: SyncControlsProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex flex-wrap items-center gap-2">
        <button className={btn} onClick={onPrev} disabled={atStart} aria-label="Назад">
          ← Назад
        </button>
        <button className={btn} onClick={onForward} disabled={!canAdvance} aria-label="Дальше">
          Дальше →
        </button>
        <button className={btn} onClick={onRandomStep} disabled={!canAdvance} aria-label="Случайный шаг">
          🎲 Случайный шаг
        </button>
        <button className={btnPrimary} onClick={onPlayToggle} aria-label="Авто или пауза">
          {isPlaying ? '⏸ Пауза' : '▶ Авто'}
        </button>
        <button className={btn} onClick={onReset} aria-label="Сброс">
          ↺ Сброс
        </button>
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          шаг {stepIndex} / {totalSteps - 1}
        </span>
        <label className="ml-auto flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          скорость
          <input
            type="range"
            min={150}
            max={1500}
            step={50}
            value={1650 - speedMs}
            onChange={(e) => onSpeedChange(1650 - parseInt(e.target.value, 10))}
            className="accent-sky-500"
            aria-label="Скорость"
          />
        </label>
      </div>

      {presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-700/60">
          <span className="text-[11px] font-medium text-slate-400">пресеты:</span>
          {presets.map((p) => (
            <button key={p.label} className={chip} onClick={p.onClick}>
              {p.label}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-slate-400">
            кликни «▶ шаг» в дорожке потока, чтобы выбрать следующий вручную
          </span>
        </div>
      )}
    </div>
  )
}
