import type { SyncState } from '../../lib/sync'
import { isDeadlocked } from '../../lib/sync'
import { fragmentColor } from '../fragmentColor'

interface WaitGraphProps {
  state: SyncState
}

/** Resource wait-for graph: holds (lock→thread) and waits (thread→lock). A cycle = deadlock. */
export function WaitGraph({ state }: WaitGraphProps) {
  const lockIds = Object.keys(state.locks)
  const deadlocked = isDeadlocked(state)

  const threadPos = (id: number) => ({ x: 70, y: 50 + id * 80 })
  const lockPos = (idx: number) => ({ x: 250, y: 50 + idx * 80 })
  const lockIndex = (id: string) => lockIds.indexOf(id)

  const holds: Array<{ lock: string; thread: number }> = []
  const waits: Array<{ thread: number; lock: string }> = []
  for (const id of lockIds) {
    const L = state.locks[id]
    if (L.owner !== null) holds.push({ lock: id, thread: L.owner })
  }
  for (const t of state.threads) {
    if (t.status === 'blocked' && t.blockedOn && state.locks[t.blockedOn]) {
      waits.push({ thread: t.id, lock: t.blockedOn })
    }
  }

  const arrow = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len
    const uy = dy / len
    return { x1: x1 + ux * 24, y1: y1 + uy * 18, x2: x2 - ux * 28, y2: y2 - uy * 22 }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
          Граф ожидания ресурсов
        </h3>
        {deadlocked && (
          <span className="rounded-full bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white">
            ⛔ цикл — взаимная блокировка
          </span>
        )}
      </div>
      <svg viewBox="0 0 320 220" className="h-auto w-full" role="img" aria-label="Граф ожидания">
        <defs>
          <marker id="ah-hold" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#10b981" />
          </marker>
          <marker id="ah-wait" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" />
          </marker>
        </defs>

        {holds.map((h, i) => {
          const lp = lockPos(lockIndex(h.lock))
          const tp = threadPos(h.thread)
          const a = arrow(lp.x, lp.y, tp.x, tp.y)
          return (
            <line
              key={`h${i}`}
              x1={a.x1}
              y1={a.y1}
              x2={a.x2}
              y2={a.y2}
              stroke="#10b981"
              strokeWidth={2}
              markerEnd="url(#ah-hold)"
            />
          )
        })}
        {waits.map((w, i) => {
          const tp = threadPos(w.thread)
          const lp = lockPos(lockIndex(w.lock))
          const a = arrow(tp.x, tp.y, lp.x, lp.y)
          return (
            <line
              key={`w${i}`}
              x1={a.x1}
              y1={a.y1}
              x2={a.x2}
              y2={a.y2}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 4"
              markerEnd="url(#ah-wait)"
            />
          )
        })}

        {state.threads.map((t) => {
          const p = threadPos(t.id)
          const c = fragmentColor(t.id)
          return (
            <g key={`t${t.id}`}>
              <circle cx={p.x} cy={p.y} r={22} fill={c.solid} opacity={0.85} />
              <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={10} fill="#fff">
                T{t.id + 1}
              </text>
            </g>
          )
        })}
        {lockIds.map((id, idx) => {
          const p = lockPos(idx)
          return (
            <g key={`l${id}`}>
              <rect x={p.x - 18} y={p.y - 18} width={36} height={36} rx={6} fill="#475569" />
              <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={12} fill="#fff">
                {id}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="flex gap-3 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-4 bg-emerald-500" /> держит
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-4 border-b border-dashed border-rose-500" /> ждёт
        </span>
      </div>
    </div>
  )
}
