import { motion } from 'framer-motion'
import type { Fragment, FragmentView } from '../../lib/join'

interface SortMergeViewProps {
  fragment: Fragment
  view: FragmentView
}

function Column({
  title,
  rows,
  pointer,
  currentKey,
  accent,
}: {
  title: string
  rows: { key: string; val: number }[]
  pointer: number
  currentKey: string | null
  accent: 'a' | 'b'
}) {
  const accentRing = accent === 'a' ? 'ring-sky-400' : 'ring-violet-400'
  const accentText = accent === 'a' ? 'text-sky-600 dark:text-sky-300' : 'text-violet-600 dark:text-violet-300'
  return (
    <div className="flex min-w-[88px] flex-col gap-1">
      <span className={`text-[10px] font-semibold uppercase tracking-wide ${accentText}`}>{title}</span>
      <div className="flex flex-col gap-0.5">
        {rows.length === 0 && <span className="text-[11px] text-slate-400">пусто</span>}
        {rows.map((r, i) => {
          const isPointer = i === pointer
          const isCurrent = currentKey !== null && r.key === currentKey
          return (
            <div
              key={`${r.key}-${i}`}
              className={`flex items-center justify-between gap-2 rounded px-1.5 py-0.5 font-mono text-[11px] tabular-nums transition-colors ${
                isPointer
                  ? `bg-amber-100 ring-2 dark:bg-amber-400/15 ${accentRing}`
                  : isCurrent
                    ? 'bg-slate-100 dark:bg-slate-700/50'
                    : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <span className="font-semibold">{r.key}</span>
              <span>{r.val}</span>
              {isPointer && <span className="text-[9px] text-amber-600 dark:text-amber-300">▶</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SortMergeView({ fragment, view }: SortMergeViewProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-3">
        <Column
          title="A (sorted)"
          rows={fragment.a}
          pointer={view.aPointer}
          currentKey={view.currentKey}
          accent="a"
        />
        <Column
          title="B (sorted)"
          rows={fragment.b}
          pointer={view.bPointer}
          currentKey={view.currentKey}
          accent="b"
        />

        {/* Scoop buffer + running sum */}
        <div className="flex min-w-[120px] flex-1 flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            черпак / сумма
          </span>
          {view.comparison && (
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              {view.comparison}
            </span>
          )}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] text-slate-400">b[ ]</span>
            {view.buffer.length === 0 && <span className="text-[11px] text-slate-300">—</span>}
            {view.buffer.map((v, i) => (
              <span
                key={i}
                className="rounded bg-sky-100 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-sky-700 dark:bg-sky-500/20 dark:text-sky-200"
              >
                {v}
              </span>
            ))}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[10px] text-slate-400">Σbc =</span>
            <motion.span
              key={`${view.runningSum}-${view.justAdded ?? 'x'}`}
              initial={view.justAdded !== null ? { scale: 1.25 } : false}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              className="font-mono text-base font-semibold tabular-nums text-slate-800 dark:text-slate-100"
            >
              {view.runningSum}
            </motion.span>
            {view.justAdded !== null && (
              <span className="rounded bg-amber-200 px-1 font-mono text-[11px] font-semibold text-amber-900 dark:bg-amber-400/30 dark:text-amber-100">
                +{view.justAdded}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
