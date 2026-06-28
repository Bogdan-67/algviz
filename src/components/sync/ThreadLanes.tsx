import type { SyncState, ThreadState } from '../../lib/sync'
import { fragmentColor } from '../fragmentColor'

interface ThreadLanesProps {
  state: SyncState
  onStep: (tid: number) => void
}

const statusBadge: Record<ThreadState['status'], string> = {
  ready: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200',
  blocked: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
}
const statusLabel: Record<ThreadState['status'], string> = {
  ready: 'готов',
  blocked: 'заблокирован',
  done: 'завершён',
}

function Lane({ t, onStep }: { t: ThreadState; onStep: (tid: number) => void }) {
  const color = fragmentColor(t.id)
  return (
    <div
      className="flex min-w-[180px] flex-1 flex-col gap-2 rounded-lg border-l-4 border bg-white/70 p-3 dark:bg-slate-900/40"
      style={{ borderLeftColor: color.solid, ...color.chip, background: undefined }}
    >
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ background: color.solid }} aria-hidden />
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-100">{t.name}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge[t.status]}`}>
          {statusLabel[t.status]}
          {t.blockedOn ? ` (${t.blockedOn})` : ''}
        </span>
      </div>

      <ol className="flex flex-col gap-0.5">
        {t.program.map((ins, i) => {
          const isCurrent = i === t.pc && t.status !== 'done'
          return (
            <li
              key={i}
              className={`flex items-center gap-2 rounded px-2 py-1 font-mono text-[11px] transition-colors ${
                isCurrent
                  ? t.status === 'blocked'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-100'
                    : 'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-100'
                  : i < t.pc
                    ? 'text-slate-400 line-through dark:text-slate-600'
                    : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <span className="w-4 shrink-0 text-right text-slate-400">{i + 1}</span>
              <span>{ins.text}</span>
              {isCurrent && <span className="ml-auto">{t.status === 'blocked' ? '⏳' : '▸'}</span>}
            </li>
          )
        })}
      </ol>

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-slate-400">
          {Object.entries(t.regs).map(([k, v]) => `${k}=${v}`).join(' ') || ' '}
        </span>
        <button
          onClick={() => onStep(t.id)}
          disabled={t.status !== 'ready'}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors enabled:hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:enabled:hover:bg-slate-700"
        >
          ▶ шаг этого потока
        </button>
      </div>
    </div>
  )
}

export function ThreadLanes({ state, onStep }: ThreadLanesProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {state.threads.map((t) => (
        <Lane key={t.id} t={t} onStep={onStep} />
      ))}
    </div>
  )
}
