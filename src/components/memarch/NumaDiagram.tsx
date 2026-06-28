import { motion } from 'framer-motion'
import { NUMA_LOCAL, NUMA_REMOTE, type MemSnapshot } from '../../lib/memarch'
import { fragmentColor } from '../fragmentColor'

interface NumaDiagramProps {
  snapshot: MemSnapshot
}

const W = 600
const H = 360
const CX = W / 2
const CY = H / 2 + 6
const R = 120

export function NumaDiagram({ snapshot }: NumaDiagramProps) {
  const p = snapshot.p
  const access = snapshot.access
  const node = (i: number) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / p
    return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) }
  }

  const fromN = access ? node(access.proc) : null
  const toN = access ? node(access.target) : null
  const isLocal = access?.local ?? false

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Схема NUMA">
      {/* interconnect hub + spokes */}
      {Array.from({ length: p }, (_, i) => {
        const n = node(i)
        return <line key={`s${i}`} x1={CX} y1={CY} x2={n.x} y2={n.y} stroke="#cbd5e1" strokeWidth={1.5} />
      })}
      <circle cx={CX} cy={CY} r={22} fill="#64748b" />
      <text x={CX} y={CY - 1} textAnchor="middle" fontSize={8} fill="#fff">
        inter-
      </text>
      <text x={CX} y={CY + 9} textAnchor="middle" fontSize={8} fill="#fff">
        connect
      </text>

      {/* remote path highlight via hub */}
      {access && !isLocal && fromN && toN && (
        <>
          <line x1={fromN.x} y1={fromN.y} x2={CX} y2={CY} stroke="#ef4444" strokeWidth={3} />
          <line x1={CX} y1={CY} x2={toN.x} y2={toN.y} stroke="#ef4444" strokeWidth={3} />
        </>
      )}

      {/* nodes */}
      {Array.from({ length: p }, (_, i) => {
        const n = node(i)
        const isActive = access?.proc === i
        const isTarget = access?.target === i
        const color = fragmentColor(i)
        const procFill = isActive ? color.solid : '#e2e8f0'
        const memFill = isTarget ? (isLocal ? '#22c55e' : '#ef4444') : '#cbd5e1'
        return (
          <g key={i}>
            <rect x={n.x - 42} y={n.y - 20} width={84} height={40} rx={7} fill="#f8fafc" stroke="#94a3b8" strokeWidth={1.5} className="dark:fill-slate-800" />
            <rect x={n.x - 38} y={n.y - 15} width={36} height={30} rx={4} fill={procFill} />
            <text x={n.x - 20} y={n.y} textAnchor="middle" dominantBaseline="central" fontSize={10} fill={isActive ? '#fff' : '#334155'} fontWeight="bold">
              П{i}
            </text>
            <rect x={n.x + 2} y={n.y - 15} width={36} height={30} rx={4} fill={memFill} opacity={isTarget ? 0.9 : 0.5} />
            <text x={n.x + 20} y={n.y} textAnchor="middle" dominantBaseline="central" fontSize={8} fill={isTarget ? '#fff' : '#475569'}>
              мем{i}
            </text>
            {/* local access arrow */}
            {isActive && isLocal && (
              <text x={n.x} y={n.y - 25} textAnchor="middle" fontSize={9} fill="#16a34a" fontWeight="bold">
                локально ✓
              </text>
            )}
          </g>
        )
      })}

      {/* moving dot */}
      {access && fromN && toN && (
        <motion.circle
          key={snapshot.index}
          r={5}
          fill={isLocal ? '#22c55e' : '#ef4444'}
          initial={{ cx: fromN.x, cy: fromN.y }}
          animate={
            isLocal
              ? { cx: fromN.x, cy: fromN.y }
              : { cx: [fromN.x, CX, toN.x], cy: [fromN.y, CY, toN.y] }
          }
          transition={{ duration: isLocal ? 0.3 : 0.8 }}
        />
      )}

      <text x={16} y={H - 8} fontSize={9} fill="#16a34a">
        ● локальное = {NUMA_LOCAL}
      </text>
      <text x={120} y={H - 8} fontSize={9} fill="#ef4444">
        ● удалённое = {NUMA_REMOTE} (через interconnect)
      </text>
      <text x={W - 16} y={H - 8} textAnchor="end" fontSize={9} fill="#94a3b8">
        единое адресное пространство, неоднородное время
      </text>
    </svg>
  )
}
