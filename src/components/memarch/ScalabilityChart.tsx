import { scalabilitySeries } from '../../lib/memarch'
import { Chart, Legend, type SeriesDef } from '../speedup/Chart'

interface ScalabilityChartProps {
  pMax: number
  locality: number
  currentP: number
}

const UMA_COLOR = '#f59e0b'
const NUMA_COLOR = '#22c55e'

export function ScalabilityChart({ pMax, locality, currentP }: ScalabilityChartProps) {
  const { uma, numa } = scalabilitySeries(pMax, locality)
  const series: SeriesDef[] = [
    { label: 'UMA', color: UMA_COLOR, points: uma.map((d) => ({ x: d.p, y: d.v })) },
    { label: 'NUMA', color: NUMA_COLOR, points: numa.map((d) => ({ x: d.p, y: d.v })) },
  ]
  const yMax = Math.max(...uma.map((d) => d.v), ...numa.map((d) => d.v)) * 1.15

  return (
    <div className="flex flex-col gap-2">
      <Chart
        series={series}
        xLog={false}
        xMax={pMax}
        yMax={yMax}
        xLabel="число процессоров p"
        yLabel="средняя задержка"
        markerX={currentP}
      />
      <Legend
        items={[
          { label: 'UMA — растёт (конкуренция за шину)', color: UMA_COLOR },
          { label: `NUMA — низкая при локальности ${(locality * 100).toFixed(0)}%`, color: NUMA_COLOR },
        ]}
      />
    </div>
  )
}
