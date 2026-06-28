import { amdahl, gustafson, efficiency, sampleP } from '../../lib/speedup'
import { Chart, Legend, type SeriesDef } from './Chart'
import { COLORS } from './SpeedupChart'

interface EfficiencyChartProps {
  f: number
  pMax: number
  xLog: boolean
  currentP: number
}

export function EfficiencyChart({ f, pMax, xLog, currentP }: EfficiencyChartProps) {
  const ps = sampleP(pMax, xLog)
  const series: SeriesDef[] = [
    {
      label: 'Амдал',
      color: COLORS.amdahl,
      points: ps.map((p) => ({ x: p, y: efficiency(amdahl(f, p), p) })),
    },
    {
      label: 'Густафсон',
      color: COLORS.gustafson,
      points: ps.map((p) => ({ x: p, y: efficiency(gustafson(f, p), p) })),
    },
    { label: 'Идеал', color: COLORS.ideal, dashed: true, points: ps.map((p) => ({ x: p, y: 1 })) },
  ]

  return (
    <div className="flex flex-col gap-2">
      <Chart
        series={series}
        xLog={xLog}
        xMax={pMax}
        yMax={1.05}
        xLabel="число процессоров p"
        yLabel="эффективность E(p)"
        markerX={currentP}
      />
      <Legend
        items={[
          { label: 'Амдал — падает (убывающая отдача)', color: COLORS.amdahl },
          { label: 'Густафсон → 1−f', color: COLORS.gustafson },
          { label: 'идеал = 1', color: COLORS.ideal, dashed: true },
        ]}
      />
    </div>
  )
}
