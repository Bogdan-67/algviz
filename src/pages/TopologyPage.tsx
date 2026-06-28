import { useCallback, useMemo, useState } from 'react'
import {
  buildGraph,
  layoutFor,
  degreeStats,
  diameter,
  bisectionWidth,
  avgPathLength,
  shortestPath,
  bisectionPartition,
  type TopologyKind,
  type TopologyParams,
} from '../lib/topology'
import { DEFAULT_PARAMS } from '../lib/topologyData'
import { TopologyControls, type Highlights } from '../components/topology/TopologyControls'
import { TopologyGraph } from '../components/topology/TopologyGraph'
import { TopologyMetrics } from '../components/topology/TopologyMetrics'
import { UseCaseList } from '../components/topology/UseCaseList'
import { CompareTable } from '../components/topology/CompareTable'

interface TopologyPageProps {
  onNavigateCannon: () => void
}

export function TopologyPage({ onNavigateCannon }: TopologyPageProps) {
  const [kind, setKind] = useState<TopologyKind>('hypercube')
  const [params, setParams] = useState<TopologyParams>(DEFAULT_PARAMS)
  const [highlights, setHighlights] = useState<Highlights>({
    diameter: false,
    bisection: false,
    degree: false,
  })
  const [hovered, setHovered] = useState<number | null>(null)

  const graph = useMemo(() => buildGraph(kind, params), [kind, params])
  const positions = useMemo(() => layoutFor(kind, params, graph), [kind, params, graph])
  const degree = useMemo(() => degreeStats(graph), [graph])
  const diam = useMemo(() => diameter(graph), [graph])
  const bisection = useMemo(() => bisectionWidth(graph, kind, params), [graph, kind, params])
  const avgPath = useMemo(() => avgPathLength(graph), [graph])
  const cut = useMemo(() => bisectionPartition(graph, kind, params), [graph, kind, params])

  const diameterPath = highlights.diameter ? shortestPath(graph, diam.from, diam.to) : null
  const cutEdges = highlights.bisection ? cut.cutEdges : null
  const degreeNode = highlights.degree ? degree.maxNode : null

  const handleKind = useCallback((k: TopologyKind) => {
    setKind(k)
    setHovered(null)
  }, [])

  const handleParam = useCallback((key: keyof TopologyParams, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }))
    setHovered(null)
  }, [])

  const handleToggle = useCallback(
    (key: keyof Highlights) => setHighlights((prev) => ({ ...prev, [key]: !prev[key] })),
    [],
  )

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Топологии межсоединений</h1>
        <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          Структура связей между узлами параллельной системы. Выбери топологию и размер — граф,
          характеристики (степень, диаметр, бисекция) и список подходящих задач пересчитываются
          вживую. Всё считается локально.
        </p>
      </header>

      <TopologyControls
        kind={kind}
        onKind={handleKind}
        params={params}
        onParam={handleParam}
        highlights={highlights}
        onToggle={handleToggle}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-4 rounded bg-amber-400" /> диаметр
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-4 rounded bg-indigo-500" /> разрез бисекции
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full bg-rose-500" /> макс. степень
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-4 rounded border border-dashed border-slate-400" />{' '}
              заворот (wrap)
            </span>
          </div>
          <TopologyGraph
            graph={graph}
            positions={positions}
            diameterPath={diameterPath}
            cutEdges={cutEdges}
            degreeNode={degreeNode}
            hovered={hovered}
            onHover={setHovered}
          />
        </section>

        <aside className="flex flex-col gap-5">
          <TopologyMetrics
            graph={graph}
            degree={degree}
            diameter={diam}
            bisection={bisection}
            avgPath={avgPath}
            hovered={hovered}
          />
          <UseCaseList kind={kind} onOpenCannon={onNavigateCannon} />
        </aside>
      </div>

      <CompareTable current={kind} targetCount={graph.nodes.length} />

      <footer className="pb-4 text-center text-xs text-slate-400 dark:text-slate-600">
        Наведи на узел — соседи и степень · переключай подсветки · симуляция, всё локально
      </footer>
    </div>
  )
}
