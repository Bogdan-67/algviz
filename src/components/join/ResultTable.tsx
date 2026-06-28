import { AnimatePresence, motion } from 'framer-motion'
import type { ResultRow } from '../../lib/join'

interface ResultTableProps {
  result: ResultRow[]
  expectedCount: number
  isCorrect: boolean
}

export function ResultTable({ result, expectedCount, isCorrect }: ResultTableProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
          Результат (ключ, ΣBC) · {result.length}/{expectedCount}
        </h3>
        <span
          role="status"
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isCorrect
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
          }`}
        >
          {isCorrect ? '✓ результат верный' : '✕ ошибка проверки'}
        </span>
      </div>

      <div className="flex max-h-64 flex-wrap content-start gap-1 overflow-y-auto scroll-thin">
        {result.length === 0 && (
          <span className="text-[11px] text-slate-400">пока пусто — строки прилетают пачкой</span>
        )}
        <AnimatePresence>
          {result.map((r) => (
            <motion.span
              key={r.key}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 font-mono text-[11px] tabular-nums text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
            >
              {r.key} → {r.sumBC}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
