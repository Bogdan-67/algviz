import { useState } from 'react'
import type { Preset, SortKind } from '../../lib/sort'

interface SortControlsProps {
  kind: SortKind
  onKind: (k: SortKind) => void
  n: number
  sizes: number[]
  onSize: (n: number) => void
  onPreset: (p: Preset) => void
  onRandom: () => void
  onManual: (values: number[]) => void
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
const chip =
  'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'

const ALGOS: Array<{ id: SortKind; label: string }> = [
  { id: 'oddeven', label: 'Чётно-нечётная' },
  { id: 'bitonic', label: 'Битоническая' },
]
const PRESETS: Array<{ id: Preset; label: string }> = [
  { id: 'random', label: 'Случайно' },
  { id: 'sorted', label: 'Отсортирован' },
  { id: 'reversed', label: 'Обратный' },
  { id: 'nearly', label: 'Почти' },
]

export function SortControls(props: SortControlsProps) {
  const {
    kind,
    onKind,
    n,
    sizes,
    onSize,
    onPreset,
    onRandom,
    onManual,
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
  const [manual, setManual] = useState('')

  const applyManual = () => {
    const values = manual
      .split(/[\s,]+/)
      .map((s) => parseInt(s, 10))
      .filter((v) => !Number.isNaN(v))
    if (values.length >= 2) onManual(values)
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      {/* Algorithm + size */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5" role="radiogroup" aria-label="Алгоритм">
          {ALGOS.map((a) => (
            <button
              key={a.id}
              role="radio"
              aria-checked={kind === a.id}
              onClick={() => onKind(a.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                kind === a.id
                  ? 'border-sky-500 bg-sky-500 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          n =
          <select
            value={n}
            onChange={(e) => onSize(parseInt(e.target.value, 10))}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-sm dark:border-slate-600 dark:bg-slate-800"
            aria-label="Размер массива"
          >
            {sizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {kind === 'bitonic' && <span className="text-[11px] text-slate-400">степень двойки</span>}
        </label>
      </div>

      {/* Presets + manual */}
      <div className="flex flex-wrap items-center gap-2">
        <button className={btn} onClick={onRandom}>
          🎲 Случайные данные
        </button>
        {PRESETS.map((p) => (
          <button key={p.id} className={chip} onClick={() => onPreset(p.id)}>
            {p.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyManual()}
            placeholder="ручной ввод: 5, 2, 9…"
            className="w-44 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
            aria-label="Ручной ввод значений"
          />
          <button className={chip} onClick={applyManual}>
            ОК
          </button>
        </div>
      </div>

      {/* Transport */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-700/60">
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
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          фаза {stepIndex} из {totalSteps - 1}
        </span>
        <label className="ml-auto flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          скорость
          <input
            type="range"
            min={120}
            max={1500}
            step={60}
            value={1620 - speedMs}
            onChange={(e) => onSpeedChange(1620 - parseInt(e.target.value, 10))}
            className="accent-sky-500"
            aria-label="Скорость"
          />
        </label>
      </div>
    </div>
  )
}
