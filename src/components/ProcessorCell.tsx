import { AnimatePresence, motion } from 'framer-motion'
import { blockMultiply, type ProcessorState } from '../lib/cannon'
import { MiniMatrix } from './MiniMatrix'

interface ProcessorCellProps {
  p: ProcessorState
  b: number
  multiplying: boolean
  compact: boolean
  done: boolean
  expanded: boolean
  onToggleExpand: () => void
}

export function ProcessorCell({
  p,
  b,
  multiplying,
  compact,
  done,
  expanded,
  onToggleExpand,
}: ProcessorCellProps) {
  const isElement = b === 1
  const innerCell = compact ? 14 : isElement ? 24 : 18
  // The product of the currently held blocks (what the inner b×b multiply yields).
  const preview = blockMultiply(p.blockA, p.blockB)

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-lg border p-2 transition-colors ${
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
        <div className="flex items-center gap-1">
          {done && <span className="text-xs text-emerald-500">✓</span>}
          <button
            onClick={onToggleExpand}
            aria-label={expanded ? 'Свернуть процессор' : 'Развернуть процессор'}
            aria-expanded={expanded}
            className="rounded px-1 text-[11px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            {expanded ? '▾' : '▸'}
          </button>
        </div>
      </div>

      {/* Held blocks: A × B */}
      <div className="flex flex-wrap items-center justify-center gap-1">
        <MiniMatrix block={p.blockA} tone="a" cell={innerCell} highlight={multiplying} />
        <span className="text-slate-400">×</span>
        <MiniMatrix block={p.blockB} tone="b" cell={innerCell} highlight={multiplying} />
      </div>

      {/* Accumulated block C(I,J) */}
      <div className="flex flex-col items-center gap-0.5 border-t border-slate-100 pt-1.5 dark:border-slate-700/60">
        <span className="font-mono text-[10px] text-slate-400">
          C({p.i},{p.j}) = Σ {p.terms.length} блок(ов)
        </span>
        <motion.div
          key={p.terms.length}
          initial={p.terms.length > 0 ? { scale: 1.12 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
        >
          <MiniMatrix block={p.c} tone="c" cell={innerCell} highlight={done} />
        </motion.div>
      </div>

      {/* Expanded: inner b×b block multiplication detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 flex flex-col items-center gap-1 rounded-md border border-dashed border-slate-300 bg-slate-50/70 p-2 text-center dark:border-slate-600 dark:bg-slate-900/40">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                Внутри процессора: умножение блоков {b}×{b}
              </span>
              <div className="flex flex-wrap items-center justify-center gap-1">
                <MiniMatrix block={p.blockA} tone="a" cell={innerCell} />
                <span className="text-slate-400">·</span>
                <MiniMatrix block={p.blockB} tone="b" cell={innerCell} />
                <span className="text-slate-400">=</span>
                <MiniMatrix block={preview} tone="plain" cell={innerCell} highlight />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                затем C({p.i},{p.j}) += этот блок
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
