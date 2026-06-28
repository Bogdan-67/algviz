import { amdahl, gustafson, amdahlLimit, sampleP } from '../../lib/speedup'
import { Chart, Legend, type SeriesDef, type HLine } from './Chart'

export const COLORS = {
  amdahl: '#0ea5e9',
  gustafson: '#f59e0b',
  ideal: '#94a3b8',
}

interface SpeedupChartProps {
  f: number
  pMax: number
  xLog: boolean
  show: { amdahl: boolean; gustafson: boolean; ideal: boolean }
  currentP: number
}

export function SpeedupChart({ f, pMax, xLog, show, currentP }: SpeedupChartProps) {
  const ps = sampleP(pMax, xLog)
  const series: SeriesDef[] = []
  const legend: { label: string; color: string; dashed?: boolean }[] = []

  if (show.amdahl) {
    series.push({ label: 'Амдал', color: COLORS.amdahl, points: ps.map((p) => ({ x: p, y: amdahl(f, p) })) })
    legend.push({ label: 'Амдал (strong)', color: COLORS.amdahl })
  }
  if (show.gustafson) {
    series.push({ label: 'Густафсон', color: COLORS.gustafson, points: ps.map((p) => ({ x: p, y: gustafson(f, p) })) })
    legend.push({ label: 'Густафсон (weak)', color: COLORS.gustafson })
  }
  if (show.ideal) {
    series.push({ label: 'Идеал', color: COLORS.ideal, dashed: true, points: ps.map((p) => ({ x: p, y: p })) })
    legend.push({ label: 'Идеал S = p', color: COLORS.ideal, dashed: true })
  }

  // Y range from enabled curves.
  let yMax = 1
  if (show.ideal || show.gustafson) yMax = pMax
  else if (show.amdahl) yMax = Math.max(2, Math.min(amdahlLimit(f) * 1.15, pMax))
  yMax = Math.max(yMax, 2)

  const hlines: HLine[] = []
  const limit = amdahlLimit(f)
  if (show.amdahl && Number.isFinite(limit) && limit <= yMax) {
    hlines.push({ y: limit, label: `предел 1/f = ${limit.toFixed(1)}`, color: COLORS.amdahl })
  }

  return (
    <div className="flex flex-col gap-2">
      <Chart
        series={series}
        xLog={xLog}
        xMax={pMax}
        yMax={yMax}
        xLabel="число процессоров p"
        yLabel="ускорение S(p)"
        hlines={hlines}
        markerX={currentP}
      />
      <Legend items={legend} />
    </div>
  )
}
