import { motion } from 'framer-motion'
import type { Snapshot } from '../../lib/sort'

interface ArrayBarsProps {
  snapshot: Snapshot
  /** Stable element id at each position (for swap animation). */
  idsAtPos: number[]
  maxVal: number
}

export function ArrayBars({ snapshot, idsAtPos, maxVal }: ArrayBarsProps) {
  const n = snapshot.array.length
  const arr = snapshot.array

  // position → role in this phase
  const role = new Array<'none' | 'swap' | 'keep'>(n).fill('none')
  const dir = new Array<'up' | 'down' | null>(n).fill(null)
  for (const p of snapshot.pairs) {
    role[p.i] = p.swapped ? 'swap' : 'keep'
    role[p.j] = p.swapped ? 'swap' : 'keep'
    dir[p.i] = p.ascending ? 'up' : 'down'
    dir[p.j] = p.ascending ? 'up' : 'down'
  }

  // element {id, value} ordered by id, placed at its current position via flex order
  const elems = Array.from({ length: n }, (_, pos) => ({
    id: idsAtPos[pos],
    value: arr[pos],
    pos,
  }))
  const byId = elems.slice().sort((a, b) => a.id - b.id)

  const gapPct = 100 / n
  const barW = `calc(${gapPct}% - 4px)`

  return (
    <div className="flex flex-col gap-2">
      {/* Comparison arcs */}
      <svg viewBox="0 0 100 12" className="h-6 w-full" preserveAspectRatio="none" aria-hidden>
        {snapshot.pairs.map((p) => {
          const x1 = (p.i + 0.5) * gapPct
          const x2 = (p.j + 0.5) * gapPct
          const mid = (x1 + x2) / 2
          const stroke = p.swapped ? '#f59e0b' : 'rgb(148 163 184 / 0.7)'
          return (
            <g key={`${p.i}-${p.j}`}>
              <path
                d={`M ${x1} 11 Q ${mid} 0 ${x2} 11`}
                fill="none"
                stroke={stroke}
                strokeWidth={p.swapped ? 0.8 : 0.5}
                vectorEffect="non-scaling-stroke"
              />
              {snapshot.kind === 'bitonic' && (
                <text
                  x={mid}
                  y={5}
                  fontSize={4}
                  textAnchor="middle"
                  fill={p.ascending ? '#0ea5e9' : '#a855f7'}
                >
                  {p.ascending ? '▲' : '▼'}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Bars */}
      <div className="flex h-56 items-end justify-between gap-1" role="list" aria-label="Массив">
        {byId.map((e) => {
          const r = role[e.pos]
          const bg =
            r === 'swap'
              ? 'bg-amber-400 dark:bg-amber-400'
              : r === 'keep'
                ? 'bg-sky-400 dark:bg-sky-500'
                : snapshot.sorted
                  ? 'bg-emerald-400 dark:bg-emerald-500'
                  : 'bg-slate-300 dark:bg-slate-600'
          return (
            <motion.div
              key={e.id}
              layout
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="flex flex-col items-center justify-end"
              style={{ order: e.pos, width: barW }}
            >
              <span className="mb-0.5 font-mono text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
                {e.value}
              </span>
              <motion.div
                className={`w-full rounded-t ${bg}`}
                animate={{ height: `${(e.value / maxVal) * 180}px` }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              />
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
