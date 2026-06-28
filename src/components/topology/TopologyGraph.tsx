import { motion } from 'framer-motion'
import { edgeKey, type Graph, type Pos } from '../../lib/topology'

interface TopologyGraphProps {
  graph: Graph
  positions: Pos[]
  diameterPath: number[] | null
  cutEdges: Set<string> | null
  degreeNode: number | null
  hovered: number | null
  onHover: (id: number | null) => void
}

const W = 620
const H = 440
const PAD = 44

export function TopologyGraph({
  graph,
  positions,
  diameterPath,
  cutEdges,
  degreeNode,
  hovered,
  onHover,
}: TopologyGraphProps) {
  const n = graph.nodes.length
  const r = n > 24 ? 9 : n > 14 ? 11 : 14
  const fontSize = n > 24 ? 7 : n > 14 ? 8 : 9

  const px = (p: Pos) => PAD + p.x * (W - 2 * PAD)
  const py = (p: Pos) => PAD + p.y * (H - 2 * PAD)

  const neighbors = hovered === null ? null : new Set(graph.adj[hovered])
  const pathNodes = diameterPath ? new Set(diameterPath) : null
  const pathEdges = new Set<string>()
  if (diameterPath) {
    for (let i = 0; i < diameterPath.length - 1; i++) {
      pathEdges.add(edgeKey(diameterPath[i], diameterPath[i + 1]))
    }
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full select-none"
      role="img"
      aria-label="Граф топологии"
    >
      {/* Edges */}
      {graph.edges.map((e) => {
        const key = edgeKey(e.u, e.v)
        const a = positions[e.u]
        const b = positions[e.v]
        const x1 = px(a)
        const y1 = py(a)
        const x2 = px(b)
        const y2 = py(b)
        const isCut = cutEdges?.has(key)
        const isPath = pathEdges.has(key)
        const isHover =
          hovered !== null && (e.u === hovered || e.v === hovered)

        let stroke = 'rgb(148 163 184 / 0.55)'
        let width = 1.5
        if (isCut) {
          stroke = '#6366f1'
          width = 3
        } else if (isPath) {
          stroke = '#f59e0b'
          width = 3
        } else if (isHover) {
          stroke = '#38bdf8'
          width = 2.5
        }

        if (e.wrap) {
          const mx = (x1 + x2) / 2
          const my = (y1 + y2) / 2
          const dx = x2 - x1
          const dy = y2 - y1
          const len = Math.hypot(dx, dy) || 1
          const bow = 36
          const cx = mx + (-dy / len) * bow
          const cy = my + (dx / len) * bow
          return (
            <path
              key={key}
              d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
              fill="none"
              stroke={stroke}
              strokeWidth={width}
              strokeDasharray="5 4"
              opacity={0.9}
            />
          )
        }
        return (
          <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={width} />
        )
      })}

      {/* Nodes */}
      {graph.nodes.map((node) => {
        const p = positions[node.id]
        const cx = px(p)
        const cy = py(p)
        const isHovered = hovered === node.id
        const isNeighbor = neighbors?.has(node.id)
        const isDegree = degreeNode === node.id
        const isPathNode = pathNodes?.has(node.id)

        let fill = 'rgb(255 255 255)'
        let stroke = 'rgb(100 116 139)'
        let textFill = 'rgb(51 65 85)'
        if (isDegree) {
          fill = '#f43f5e'
          stroke = '#be123c'
          textFill = '#fff'
        } else if (isHovered) {
          fill = '#0ea5e9'
          stroke = '#0369a1'
          textFill = '#fff'
        } else if (isPathNode) {
          fill = '#fbbf24'
          stroke = '#b45309'
          textFill = '#3f2d00'
        } else if (isNeighbor) {
          fill = '#bae6fd'
          stroke = '#0284c7'
        }

        return (
          <motion.g
            key={node.id}
            initial={false}
            animate={{ x: cx, y: cy }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => onHover(node.id)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onHover(isHovered ? null : node.id)}
          >
            <circle r={r} fill={fill} stroke={stroke} strokeWidth={2} className="dark:opacity-95" />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fontSize}
              fontFamily="ui-monospace, monospace"
              fill={textFill}
              style={{ pointerEvents: 'none' }}
            >
              {node.label}
            </text>
          </motion.g>
        )
      })}
    </svg>
  )
}
