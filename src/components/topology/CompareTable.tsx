import {
  buildGraph,
  degreeStats,
  diameter,
  bisectionWidth,
  type TopologyKind,
  type TopologyParams,
} from '../../lib/topology'
import { TOPOLOGY_ORDER, TOPOLOGY_INFO, DEFAULT_PARAMS, paramControls } from '../../lib/topologyData'

interface CompareTableProps {
  current: TopologyKind
  /** Target node count (≈ current graph) so all topologies are comparable. */
  targetCount: number
}

function clampParam(kind: TopologyKind, key: keyof TopologyParams, value: number): number {
  const c = paramControls(kind).find((p) => p.key === key)
  if (!c) return value
  return Math.max(c.min, Math.min(c.max, value))
}

/** Pick size params for a topology so its node count ≈ target. */
function paramsForCount(kind: TopologyKind, target: number): TopologyParams {
  const p: TopologyParams = { ...DEFAULT_PARAMS }
  switch (kind) {
    case 'linear':
    case 'ring':
    case 'star':
    case 'full':
      p.n = clampParam(kind, 'n', target)
      break
    case 'mesh':
    case 'torus': {
      const side = Math.round(Math.sqrt(target))
      p.w = clampParam(kind, 'w', side)
      p.h = clampParam(kind, 'h', side)
      break
    }
    case 'tree':
      p.branching = 2
      p.levels = clampParam(kind, 'levels', Math.round(Math.log2(target + 1)))
      break
    case 'hypercube':
      p.d = clampParam(kind, 'd', Math.max(1, Math.round(Math.log2(target))))
      break
  }
  return p
}

export function CompareTable({ current, targetCount }: CompareTableProps) {
  const rows = TOPOLOGY_ORDER.map((kind) => {
    const params = paramsForCount(kind, targetCount)
    const g = buildGraph(kind, params)
    const deg = degreeStats(g)
    const bis = bisectionWidth(g, kind, params)
    return {
      kind,
      name: TOPOLOGY_INFO[kind].name,
      nodes: g.nodes.length,
      degree: deg.min === deg.max ? `${deg.max}` : `${deg.min}…${deg.max}`,
      diameter: diameter(g).diameter,
      bisection: `${bis.value}${bis.exact ? '' : '~'}`,
      strong: TOPOLOGY_INFO[kind].strongPoint,
    }
  })

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
          Сравнение топологий
        </h3>
        <span className="text-[11px] text-slate-400">при размере ≈ {targetCount} узлов</span>
      </div>
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-2 py-1.5 font-medium">Топология</th>
              <th className="px-2 py-1.5 text-right font-medium">Узлы</th>
              <th className="px-2 py-1.5 text-right font-medium">Степень</th>
              <th className="px-2 py-1.5 text-right font-medium">Диаметр</th>
              <th className="px-2 py-1.5 text-right font-medium">Бисекция</th>
              <th className="px-2 py-1.5 font-medium">Сильная сторона</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isCurrent = r.kind === current
              return (
                <tr
                  key={r.kind}
                  className={`border-t border-slate-100 dark:border-slate-700/60 ${
                    isCurrent
                      ? 'bg-sky-50 font-semibold dark:bg-sky-500/10'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <td className="px-2 py-1.5 text-slate-700 dark:text-slate-200">{r.name}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{r.nodes}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{r.degree}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{r.diameter}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{r.bisection}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {r.strong}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-400 dark:text-slate-500">
        «~» — оценка бисекции. Виден компромисс: у полносвязного диаметр 1, но степень p−1; у
        кольца степень 2, но большой диаметр.
      </p>
    </div>
  )
}
