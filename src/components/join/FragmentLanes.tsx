import { AnimatePresence, motion } from 'framer-motion'
import type { Fragment, FragmentView, JoinSnapshot } from '../../lib/join'
import { fragmentColor } from '../fragmentColor'
import { SortMergeView } from './SortMergeView'

interface FragmentLanesProps {
  snapshot: JoinSnapshot
  fragments: Fragment[]
  /** Per-fragment cost (abstract time units), to show load/bottleneck. */
  perExecutor: number[]
  bottleneck: number
}

const statusBadge: Record<FragmentView['status'], string> = {
  idle: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  running: 'bg-amber-200 text-amber-800 dark:bg-amber-400/25 dark:text-amber-100',
  done: 'bg-emerald-200 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-100',
}

const statusLabel: Record<FragmentView['status'], string> = {
  idle: 'ожидание',
  running: 'работает',
  done: 'готово',
}

function SpBoxView({ view }: { view: FragmentView }) {
  const pct = Math.round(view.progress * 100)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-900 px-3 py-2 text-slate-100 dark:border-slate-600">
        <span className="text-lg" aria-hidden>
          🗄️
        </span>
        <span className="text-[11px] font-medium leading-tight">
          Движок БД · A⋈B по ключу
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <motion.div
          className="h-full rounded-full bg-emerald-500"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.2 }}
        />
      </div>
      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{pct}%</span>
    </div>
  )
}

function RbarView({ view }: { view: FragmentView }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="rounded bg-rose-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-rose-700 dark:bg-rose-500/20 dark:text-rose-200">
          обращений к БД: {view.roundTrips}
        </span>
        <span className="text-[10px] text-slate-400">по одному запросу на ключ</span>
      </div>
      {view.currentKey && (
        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
          {view.caption}
        </span>
      )}
      <div className="flex flex-wrap gap-1">
        {view.emittedKeys.map((k) => (
          <span
            key={k}
            className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
          >
            {k}
          </span>
        ))}
      </div>
    </div>
  )
}

export function FragmentLanes({ snapshot, fragments, perExecutor, bottleneck }: FragmentLanesProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
          Параллельные дорожки ({fragments.length} исполнителей)
        </h2>
        <AnimatePresence>
          {snapshot.atBarrier && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white"
            >
              ⏸ барьер синхронизации
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-3">
        {snapshot.fragments.map((view) => {
          const color = fragmentColor(view.id)
          const frag = fragments[view.id]
          const isBottleneck = view.id === bottleneck
          return (
            <div
              key={view.id}
              className="flex flex-col gap-2 rounded-lg border-l-4 border bg-white/70 p-3 dark:bg-slate-900/40"
              style={{ borderLeftColor: color.solid, ...color.chip, background: undefined }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: color.solid }}
                  aria-hidden
                />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-100">
                  Исполнитель {view.id}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge[view.status]}`}>
                  {statusLabel[view.status]}
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  время ≈ {perExecutor[view.id]}
                </span>
                {isBottleneck && perExecutor[view.id] > 0 && (
                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-500/20 dark:text-rose-200">
                    узкое место
                  </span>
                )}
                <span className="ml-auto text-[11px] text-slate-400">{view.caption}</span>
              </div>

              {snapshot.method === 'scoop' && <SortMergeView fragment={frag} view={view} />}
              {snapshot.method === 'sp' && <SpBoxView view={view} />}
              {snapshot.method === 'rbar' && <RbarView view={view} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
