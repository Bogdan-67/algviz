import { motion } from 'framer-motion'
import { amdahl } from '../../lib/speedup'

interface TimeSplitBarProps {
  f: number
  p: number
}

/**
 * Splits program time into serial f and parallel (1-f). The serial part stays
 * fixed while the parallel part shrinks by p — visually why there's a ceiling.
 */
export function TimeSplitBar({ f, p }: TimeSplitBarProps) {
  const parallel = (1 - f) / p
  const total = f + parallel // = 1/amdahl
  const speedup = amdahl(f, p)
  const pct = (x: number) => `${x * 100}%`

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
          Разбиение времени
        </h3>
        <span className="text-xs text-slate-400">серийная часть не сжимается</span>
      </div>

      {/* T(1) baseline */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-slate-400">T(1) = 1 — на одном процессоре</span>
        <div className="flex h-9 w-full overflow-hidden rounded-md">
          <div className="flex items-center justify-center bg-rose-400 text-[10px] font-semibold text-white dark:bg-rose-500" style={{ width: pct(f) }}>
            {f >= 0.08 ? `f=${f.toFixed(2)}` : ''}
          </div>
          <div className="flex items-center justify-center bg-sky-400 text-[10px] font-semibold text-white dark:bg-sky-500" style={{ width: pct(1 - f) }}>
            параллельно 1−f
          </div>
        </div>
      </div>

      {/* T(p) scaled */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-slate-400">
          T({Math.round(p)}) = f + (1−f)/p = {total.toFixed(3)}
        </span>
        <div className="h-9 w-full rounded-md bg-slate-100 dark:bg-slate-900/40">
          <div className="flex h-full overflow-hidden rounded-md" style={{ width: pct(total) }}>
            <motion.div
              className="flex items-center justify-center bg-rose-400 dark:bg-rose-500"
              animate={{ width: pct(f / total) }}
              transition={{ type: 'spring', stiffness: 200, damping: 26 }}
            >
              <span className="text-[10px] font-semibold text-white">f</span>
            </motion.div>
            <motion.div
              className="flex items-center justify-center overflow-hidden bg-sky-400 dark:bg-sky-500"
              animate={{ width: pct(parallel / total) }}
              transition={{ type: 'spring', stiffness: 200, damping: 26 }}
            >
              <span className="whitespace-nowrap text-[10px] font-semibold text-white">(1−f)/p</span>
            </motion.div>
          </div>
        </div>
      </div>

      <p className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">
        Параллельная часть сжимается в p раз, серийная f — нет. Поэтому время не опускается ниже f,
        а ускорение S = 1/T = <span className="font-mono font-semibold">{speedup.toFixed(2)}×</span>{' '}
        упирается в потолок 1/f = {f > 0 ? (1 / f).toFixed(1) : '∞'}.
      </p>
    </div>
  )
}
