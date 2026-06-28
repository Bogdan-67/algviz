import { motion } from 'framer-motion'
import type { MemSnapshot } from '../../lib/memarch'
import { fragmentColor } from '../fragmentColor'

interface UmaDiagramProps {
  snapshot: MemSnapshot
  showBusLoad: boolean
}

const W = 600
const H = 320

export function UmaDiagram({ snapshot, showBusLoad }: UmaDiagramProps) {
  const p = snapshot.p
  const active = snapshot.access?.proc ?? null
  const busBusy = snapshot.busBusy
  const busActive = active !== null
  const procY = 50
  const busY = 180
  const memY = 250
  const slot = W / p
  const procX = (i: number) => slot * (i + 0.5)
  const memX = W / 2

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Схема UMA">
      {/* bus */}
      <rect
        x={30}
        y={busY - 7}
        width={W - 60}
        height={14}
        rx={7}
        fill={busActive && (busBusy > 0 || showBusLoad) ? '#f59e0b' : '#94a3b8'}
        opacity={busActive ? 0.9 : 0.5}
      />
      <text x={W - 34} y={busY + 4} textAnchor="end" fontSize={9} fill="#fff">
        общая шина
      </text>

      {/* memory */}
      <rect x={memX - 70} y={memY} width={140} height={48} rx={8} fill="#475569" />
      <text x={memX} y={memY + 20} textAnchor="middle" fontSize={11} fill="#fff" fontWeight="bold">
        Общая память
      </text>
      <text x={memX} y={memY + 36} textAnchor="middle" fontSize={8} fill="#cbd5e1">
        единый банк · одинаковое время
      </text>
      <line x1={memX} y1={busY + 7} x2={memX} y2={memY} stroke="#94a3b8" strokeWidth={2} />

      {/* processors */}
      {Array.from({ length: p }, (_, i) => {
        const x = procX(i)
        const isActive = active === i
        const color = fragmentColor(i)
        return (
          <g key={i}>
            <line
              x1={x}
              y1={procY + 38}
              x2={x}
              y2={busY - 7}
              stroke={isActive ? '#f59e0b' : '#cbd5e1'}
              strokeWidth={isActive ? 3 : 1.5}
            />
            <rect
              x={x - 26}
              y={procY}
              width={52}
              height={38}
              rx={6}
              fill={isActive ? color.solid : '#e2e8f0'}
              stroke={isActive ? '#b45309' : '#94a3b8'}
              strokeWidth={1.5}
            />
            <text x={x} y={procY + 15} textAnchor="middle" fontSize={11} fill={isActive ? '#fff' : '#334155'} fontWeight="bold">
              П{i}
            </text>
            <text x={x} y={procY + 30} textAnchor="middle" fontSize={7} fill={isActive ? '#fff' : '#64748b'}>
              ▦ кэш
            </text>
          </g>
        )
      })}

      {/* moving request dot */}
      {active !== null && (
        <motion.circle
          key={snapshot.index}
          r={5}
          fill="#f59e0b"
          initial={{ cx: procX(active), cy: procY + 38 }}
          animate={{ cx: [procX(active), procX(active), memX, memX], cy: [procY + 38, busY, busY, memY] }}
          transition={{ duration: 0.8, times: [0, 0.4, 0.7, 1] }}
        />
      )}

      {/* contention queue */}
      {busBusy > 0 && (
        <g>
          <text x={36} y={busY - 14} fontSize={9} fill="#b45309" fontWeight="bold">
            очередь за шину: +{busBusy}
          </text>
          {Array.from({ length: Math.min(busBusy, 6) }, (_, k) => (
            <rect key={k} x={36 + k * 12} y={busY + 12} width={9} height={9} rx={2} fill="#f59e0b" />
          ))}
        </g>
      )}

      <text x={30} y={H - 6} fontSize={9} fill="#94a3b8">
        ▦ когерентность кэшей держит копии общих данных согласованными
      </text>
    </svg>
  )
}
