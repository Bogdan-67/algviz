import { motion } from 'framer-motion'
import type { ProcessorState } from '../lib/cannon'

interface ProcessorCellProps {
  p: ProcessorState
  multiplying: boolean
  /** Show the full per-term formula breakdown (only for small N). */
  showFormula: boolean
  compact: boolean
  done: boolean
}

export function ProcessorCell({
  p,
  multiplying,
  showFormula,
  compact,
  done,
}: ProcessorCellProps) {
  const hasTerms = p.terms.length > 0

  return (
    <div
      className={`flex flex-col gap-1 rounded-lg border p-2 transition-colors ${
        done
          ? 'border-emerald-400/70 bg-emerald-50/60 dark:border-emerald-500/40 dark:bg-emerald-500/10'
          : multiplying
            ? 'border-amber-300 bg-amber-50/70 dark:border-amber-400/40 dark:bg-amber-400/5'
            : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          P({p.i},{p.j})
        </span>
        {done && <span className="text-xs text-emerald-500">✓</span>}
      </div>

      {/* Held operands a · b */}
      <div className="flex items-center justify-center gap-1 font-mono text-sm tabular-nums">
        <span
          className={`rounded px-1.5 py-0.5 ${
            multiplying
              ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200'
              : 'text-sky-600 dark:text-sky-300'
          }`}
        >
          {p.a}
        </span>
        <span className="text-slate-400">×</span>
        <span
          className={`rounded px-1.5 py-0.5 ${
            multiplying
              ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200'
              : 'text-violet-600 dark:text-violet-300'
          }`}
        >
          {p.b}
        </span>
      </div>

      {/* Accumulator C(i,j) */}
      <div className="flex items-baseline justify-center gap-1 border-t border-slate-100 pt-1 dark:border-slate-700/60">
        <span className="font-mono text-[10px] text-slate-400">C=</span>
        <motion.span
          key={`${p.c}-${p.terms.length}`}
          initial={hasTerms ? { scale: 1.25 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 600, damping: 24 }}
          className={`font-mono text-base font-semibold tabular-nums ${
            done
              ? 'text-emerald-600 dark:text-emerald-300'
              : 'text-slate-800 dark:text-slate-100'
          }`}
        >
          {p.c}
        </motion.span>
      </div>

      {/* Term-by-term breakdown */}
      {showFormula && !compact && (
        <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-[10px] leading-none">
          {!hasTerms && <span className="text-slate-300 dark:text-slate-600">—</span>}
          {p.terms.map((t, idx) => (
            <span key={idx} className="flex items-center gap-0.5">
              {idx > 0 && <span className="text-slate-400">+</span>}
              <span
                className={`rounded px-1 py-0.5 font-mono tabular-nums ${
                  idx === p.justAdded
                    ? 'bg-amber-200 font-semibold text-amber-900 dark:bg-amber-400/30 dark:text-amber-100'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {t.a}·{t.b}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
