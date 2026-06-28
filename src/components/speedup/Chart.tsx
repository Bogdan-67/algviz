export interface SeriesDef {
  label: string
  color: string
  points: { x: number; y: number }[]
  dashed?: boolean
}
export interface HLine {
  y: number
  label: string
  color: string
}

interface ChartProps {
  series: SeriesDef[]
  xLog: boolean
  xMax: number
  yMax: number
  xLabel: string
  yLabel: string
  hlines?: HLine[]
  markerX?: number
}

const W = 580
const H = 320
const PL = 46
const PR = 16
const PT = 16
const PB = 38

function niceTicks(max: number, count = 5): number[] {
  const step = max / count
  const mag = Math.pow(10, Math.floor(Math.log10(step)))
  const norm = step / mag
  const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10
  const s = nice * mag
  const out: number[] = []
  for (let v = 0; v <= max + 1e-9; v += s) out.push(v)
  return out
}

export function Chart({ series, xLog, xMax, yMax, xLabel, yLabel, hlines = [], markerX }: ChartProps) {
  const innerW = W - PL - PR
  const innerH = H - PT - PB

  const sx = (x: number) => {
    const t = xLog ? Math.log(x) / Math.log(xMax) : (x - 1) / (xMax - 1)
    return PL + Math.max(0, Math.min(1, t)) * innerW
  }
  const sy = (y: number) => PT + (1 - Math.max(0, Math.min(1, y / yMax))) * innerH

  const xTicks = xLog
    ? Array.from({ length: Math.log2(xMax) + 1 }, (_, i) => 2 ** i)
    : niceTicks(xMax).map((v) => (v < 1 ? 1 : v))
  const yTicks = niceTicks(yMax)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${yLabel} от ${xLabel}`}>
      {/* grid + axes */}
      {yTicks.map((v) => (
        <g key={`y${v}`}>
          <line x1={PL} y1={sy(v)} x2={W - PR} y2={sy(v)} stroke="rgb(148 163 184 / 0.18)" strokeWidth={1} />
          <text x={PL - 6} y={sy(v)} textAnchor="end" dominantBaseline="central" fontSize={9} fill="rgb(148 163 184)">
            {v % 1 === 0 ? v : v.toFixed(1)}
          </text>
        </g>
      ))}
      {xTicks.map((v) => (
        <g key={`x${v}`}>
          <line x1={sx(v)} y1={PT} x2={sx(v)} y2={H - PB} stroke="rgb(148 163 184 / 0.12)" strokeWidth={1} />
          <text x={sx(v)} y={H - PB + 12} textAnchor="middle" fontSize={9} fill="rgb(148 163 184)">
            {v}
          </text>
        </g>
      ))}

      {/* horizontal asymptote lines */}
      {hlines.map((h, i) =>
        h.y <= yMax ? (
          <g key={`h${i}`}>
            <line
              x1={PL}
              y1={sy(h.y)}
              x2={W - PR}
              y2={sy(h.y)}
              stroke={h.color}
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
            <text x={W - PR} y={sy(h.y) - 3} textAnchor="end" fontSize={9} fill={h.color}>
              {h.label}
            </text>
          </g>
        ) : null,
      )}

      {/* current-p marker */}
      {markerX !== undefined && markerX >= 1 && markerX <= xMax && (
        <line
          x1={sx(markerX)}
          y1={PT}
          x2={sx(markerX)}
          y2={H - PB}
          stroke="rgb(100 116 139 / 0.7)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      )}

      {/* series */}
      {series.map((s) => (
        <polyline
          key={s.label}
          fill="none"
          stroke={s.color}
          strokeWidth={2.2}
          strokeDasharray={s.dashed ? '6 4' : undefined}
          points={s.points
            .filter((pt) => Number.isFinite(pt.y))
            .map((pt) => `${sx(pt.x)},${sy(pt.y)}`)
            .join(' ')}
        />
      ))}

      {/* axis labels */}
      <text x={PL + innerW / 2} y={H - 4} textAnchor="middle" fontSize={10} fill="rgb(100 116 139)">
        {xLabel}
      </text>
      <text x={12} y={PT + innerH / 2} textAnchor="middle" fontSize={10} fill="rgb(100 116 139)" transform={`rotate(-90 12 ${PT + innerH / 2})`}>
        {yLabel}
      </text>
    </svg>
  )
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <span
            className="inline-block h-0.5 w-5"
            style={{
              background: it.dashed ? undefined : it.color,
              borderTop: it.dashed ? `2px dashed ${it.color}` : undefined,
            }}
          />
          {it.label}
        </span>
      ))}
    </div>
  )
}
