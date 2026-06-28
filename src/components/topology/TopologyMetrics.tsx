import type { BisectionResult, DegreeStats, DiameterResult, Graph } from '../../lib/topology'

interface TopologyMetricsProps {
  graph: Graph
  degree: DegreeStats
  diameter: DiameterResult
  bisection: BisectionResult
  avgPath: number
  hovered: number | null
}

function Row({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-2 last:border-0 dark:border-slate-700/60">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">
          {value}
        </span>
      </div>
      <span className="text-[11px] leading-tight text-slate-400 dark:text-slate-500">{hint}</span>
    </div>
  )
}

export function TopologyMetrics({
  graph,
  degree,
  diameter,
  bisection,
  avgPath,
  hovered,
}: TopologyMetricsProps) {
  const hoveredDegree = hovered === null ? null : graph.adj[hovered].length
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
        Характеристики (вживую)
      </h3>
      <Row label="Узлов" value={`${graph.nodes.length}`} hint="число процессоров p" />
      <Row label="Связей (рёбер)" value={`${graph.edges.length}`} hint="влияет на стоимость сети" />
      <Row
        label="Степень узла"
        value={degree.min === degree.max ? `${degree.max}` : `${degree.min}…${degree.max}`}
        hint="число связей; влияет на стоимость и масштабируемость"
      />
      <Row
        label="Диаметр"
        value={`${diameter.diameter}`}
        hint="макс. кратчайшее расстояние (BFS) → наихудшая задержка"
      />
      <Row
        label="Бисекция"
        value={`${bisection.value}${bisection.exact ? '' : ' (оценка)'}`}
        hint="мин. число связей для разреза сети пополам → пропускная способность"
      />
      <Row
        label="Средняя длина пути"
        value={avgPath.toFixed(2)}
        hint="среднее кратчайшее расстояние между парами"
      />
      {hoveredDegree !== null && (
        <div className="mt-1 rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
          Узел {graph.nodes[hovered!].label}: степень {hoveredDegree}
        </div>
      )}
    </div>
  )
}
