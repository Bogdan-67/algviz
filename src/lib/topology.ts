// Interconnection-network topologies — pure logic: generators, metrics, layouts.
//
// Graph is undirected, stored as a symmetric adjacency list plus an explicit
// edge list (edges carry a `wrap` flag for ring/torus wrap-around links so the
// renderer can draw them as arcs). Everything is framework-free and testable.

export type TopologyKind =
  | 'linear'
  | 'ring'
  | 'mesh'
  | 'torus'
  | 'star'
  | 'full'
  | 'tree'
  | 'hypercube'

export interface GraphNode {
  id: number
  label: string
}

export interface Edge {
  u: number
  v: number
  /** Wrap-around link (ring/torus) — drawn as an arc, not a straight line. */
  wrap?: boolean
}

export interface Graph {
  nodes: GraphNode[]
  /** adj[i] = neighbours of node i (symmetric). */
  adj: number[][]
  edges: Edge[]
}

export interface Pos {
  x: number
  y: number
}

export interface TopologyParams {
  n: number // linear, ring, star, full
  w: number // mesh, torus width
  h: number // mesh, torus height
  levels: number // tree depth
  branching: number // tree fan-out
  d: number // hypercube dimension
}

// ---------------------------------------------------------------------------
// Graph construction helpers
// ---------------------------------------------------------------------------

function emptyGraph(labels: string[]): Graph {
  return {
    nodes: labels.map((label, id) => ({ id, label })),
    adj: labels.map(() => []),
    edges: [],
  }
}

function addEdge(g: Graph, u: number, v: number, wrap = false): void {
  if (u === v) return
  if (g.adj[u].includes(v)) return
  g.adj[u].push(v)
  g.adj[v].push(u)
  g.edges.push({ u: Math.min(u, v), v: Math.max(u, v), wrap })
}

const numLabels = (n: number): string[] => Array.from({ length: n }, (_, i) => String(i))

export function buildLinear(n: number): Graph {
  const g = emptyGraph(numLabels(n))
  for (let i = 0; i < n - 1; i++) addEdge(g, i, i + 1)
  return g
}

export function buildRing(n: number): Graph {
  const g = buildLinear(n)
  if (n > 2) addEdge(g, n - 1, 0, true)
  return g
}

const meshId = (x: number, y: number, w: number): number => y * w + x

export function buildMesh(w: number, h: number): Graph {
  const g = emptyGraph(numLabels(w * h))
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const id = meshId(x, y, w)
      if (x < w - 1) addEdge(g, id, meshId(x + 1, y, w))
      if (y < h - 1) addEdge(g, id, meshId(x, y + 1, w))
    }
  }
  return g
}

export function buildTorus(w: number, h: number): Graph {
  const g = buildMesh(w, h)
  for (let y = 0; y < h; y++) {
    if (w > 2) addEdge(g, meshId(w - 1, y, w), meshId(0, y, w), true)
  }
  for (let x = 0; x < w; x++) {
    if (h > 2) addEdge(g, meshId(x, h - 1, w), meshId(x, 0, w), true)
  }
  return g
}

export function buildStar(n: number): Graph {
  const g = emptyGraph(numLabels(n))
  for (let i = 1; i < n; i++) addEdge(g, 0, i)
  return g
}

export function buildFull(n: number): Graph {
  const g = emptyGraph(numLabels(n))
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) addEdge(g, i, j)
  return g
}

export function buildTree(levels: number, branching: number): Graph {
  const labels: string[] = []
  const parent: number[] = []
  // BFS allocation of a complete `branching`-ary tree of `levels` levels.
  const queue: Array<{ id: number; level: number }> = []
  labels.push('0')
  parent.push(-1)
  queue.push({ id: 0, level: 0 })
  while (queue.length) {
    const node = queue.shift()!
    if (node.level >= levels - 1) continue
    for (let c = 0; c < branching; c++) {
      const id = labels.length
      labels.push(String(id))
      parent.push(node.id)
      queue.push({ id, level: node.level + 1 })
    }
  }
  const g = emptyGraph(labels)
  for (let id = 0; id < labels.length; id++) {
    if (parent[id] >= 0) addEdge(g, parent[id], id)
  }
  return g
}

export function buildHypercube(d: number): Graph {
  const n = 1 << d
  const labels = Array.from({ length: n }, (_, i) => i.toString(2).padStart(d, '0'))
  const g = emptyGraph(labels)
  for (let i = 0; i < n; i++) {
    for (let bit = 0; bit < d; bit++) {
      const j = i ^ (1 << bit)
      if (i < j) addEdge(g, i, j)
    }
  }
  return g
}

export function buildGraph(kind: TopologyKind, p: TopologyParams): Graph {
  switch (kind) {
    case 'linear':
      return buildLinear(p.n)
    case 'ring':
      return buildRing(p.n)
    case 'mesh':
      return buildMesh(p.w, p.h)
    case 'torus':
      return buildTorus(p.w, p.h)
    case 'star':
      return buildStar(p.n)
    case 'full':
      return buildFull(p.n)
    case 'tree':
      return buildTree(p.levels, p.branching)
    case 'hypercube':
      return buildHypercube(p.d)
  }
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export interface DegreeStats {
  min: number
  max: number
  avg: number
  /** Node id with the maximum degree. */
  maxNode: number
}

export function degreeStats(g: Graph): DegreeStats {
  if (g.nodes.length === 0) return { min: 0, max: 0, avg: 0, maxNode: 0 }
  let min = Infinity
  let max = -Infinity
  let sum = 0
  let maxNode = 0
  g.adj.forEach((nbrs, i) => {
    const deg = nbrs.length
    if (deg < min) min = deg
    if (deg > max) {
      max = deg
      maxNode = i
    }
    sum += deg
  })
  return { min, max, avg: sum / g.nodes.length, maxNode }
}

/** BFS shortest distances from `src` (Infinity if unreachable). */
export function bfsDistances(g: Graph, src: number): number[] {
  const dist = new Array<number>(g.nodes.length).fill(Infinity)
  dist[src] = 0
  const queue = [src]
  let head = 0
  while (head < queue.length) {
    const u = queue[head++]
    for (const v of g.adj[u]) {
      if (dist[v] === Infinity) {
        dist[v] = dist[u] + 1
        queue.push(v)
      }
    }
  }
  return dist
}

export function isConnected(g: Graph): boolean {
  if (g.nodes.length === 0) return true
  return bfsDistances(g, 0).every((d) => d !== Infinity)
}

export function isSymmetric(g: Graph): boolean {
  for (let u = 0; u < g.adj.length; u++) {
    for (const v of g.adj[u]) {
      if (!g.adj[v].includes(u)) return false
    }
  }
  return true
}

export interface DiameterResult {
  diameter: number
  /** Endpoints of one longest shortest path. */
  from: number
  to: number
}

export function diameter(g: Graph): DiameterResult {
  let best = 0
  let from = 0
  let to = 0
  for (let s = 0; s < g.nodes.length; s++) {
    const dist = bfsDistances(g, s)
    for (let t = 0; t < dist.length; t++) {
      if (dist[t] !== Infinity && dist[t] > best) {
        best = dist[t]
        from = s
        to = t
      }
    }
  }
  return { diameter: best, from, to }
}

/** One shortest path (node ids) between a and b, via BFS parents. */
export function shortestPath(g: Graph, a: number, b: number): number[] {
  const prev = new Array<number>(g.nodes.length).fill(-1)
  const dist = new Array<number>(g.nodes.length).fill(Infinity)
  dist[a] = 0
  const queue = [a]
  let head = 0
  while (head < queue.length) {
    const u = queue[head++]
    if (u === b) break
    for (const v of g.adj[u]) {
      if (dist[v] === Infinity) {
        dist[v] = dist[u] + 1
        prev[v] = u
        queue.push(v)
      }
    }
  }
  if (dist[b] === Infinity) return []
  const path: number[] = []
  for (let cur = b; cur !== -1; cur = prev[cur]) path.unshift(cur)
  return path
}

export function avgPathLength(g: Graph): number {
  const n = g.nodes.length
  if (n < 2) return 0
  let sum = 0
  let pairs = 0
  for (let s = 0; s < n; s++) {
    const dist = bfsDistances(g, s)
    for (let t = s + 1; t < n; t++) {
      if (dist[t] !== Infinity) {
        sum += dist[t]
        pairs++
      }
    }
  }
  return pairs === 0 ? 0 : sum / pairs
}

export interface BisectionResult {
  value: number
  /** false → heuristic estimate (honest labelling in the UI). */
  exact: boolean
}

/** Contiguous-id split cut — a simple upper-bound estimate. */
function estimateBisection(g: Graph): BisectionResult {
  const half = Math.floor(g.nodes.length / 2)
  let cut = 0
  for (const e of g.edges) {
    const lu = e.u < half
    const lv = e.v < half
    if (lu !== lv) cut++
  }
  return { value: cut, exact: false }
}

/**
 * Bisection width — exact textbook formulas for the regular topologies,
 * heuristic estimate otherwise.
 */
export function bisectionWidth(g: Graph, kind?: TopologyKind, p?: TopologyParams): BisectionResult {
  const n = g.nodes.length
  switch (kind) {
    case 'linear':
      return { value: n > 1 ? 1 : 0, exact: true }
    case 'ring':
      return { value: n > 2 ? 2 : n > 1 ? 1 : 0, exact: true }
    case 'star':
      return { value: Math.floor(n / 2), exact: true }
    case 'full':
      return { value: Math.floor(n / 2) * Math.ceil(n / 2), exact: true }
    case 'tree':
      return { value: n > 1 ? 1 : 0, exact: true }
    case 'hypercube':
      return { value: n >= 2 ? n / 2 : 0, exact: true }
    case 'mesh':
      return p ? { value: Math.min(p.w, p.h), exact: true } : estimateBisection(g)
    case 'torus':
      return p ? { value: 2 * Math.min(p.w, p.h), exact: true } : estimateBisection(g)
    default:
      return estimateBisection(g)
  }
}

// ---------------------------------------------------------------------------
// Layouts — normalized to [0,1]² so the renderer can scale with padding.
// ---------------------------------------------------------------------------

function normalize(pts: Pos[]): Pos[] {
  if (pts.length === 0) return pts
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const rx = maxX - minX || 1
  const ry = maxY - minY || 1
  return pts.map((p) => ({ x: (p.x - minX) / rx, y: (p.y - minY) / ry }))
}

export function layoutLine(n: number): Pos[] {
  if (n === 1) return [{ x: 0.5, y: 0.5 }]
  return Array.from({ length: n }, (_, i) => ({ x: i / (n - 1), y: 0.5 }))
}

export function layoutCircle(n: number, startAngle = -Math.PI / 2): Pos[] {
  return Array.from({ length: n }, (_, i) => {
    const a = startAngle + (2 * Math.PI * i) / n
    return { x: 0.5 + 0.5 * Math.cos(a), y: 0.5 + 0.5 * Math.sin(a) }
  })
}

export function layoutGrid(w: number, h: number): Pos[] {
  const pts: Pos[] = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      pts.push({ x: w === 1 ? 0.5 : x / (w - 1), y: h === 1 ? 0.5 : y / (h - 1) })
    }
  }
  return pts
}

export function layoutStar(n: number): Pos[] {
  const pts: Pos[] = [{ x: 0.5, y: 0.5 }]
  for (let i = 1; i < n; i++) {
    const a = -Math.PI / 2 + (2 * Math.PI * (i - 1)) / (n - 1)
    pts.push({ x: 0.5 + 0.5 * Math.cos(a), y: 0.5 + 0.5 * Math.sin(a) })
  }
  return pts
}

export function layoutTree(g: Graph, levels: number, branching: number): Pos[] {
  // Assign level by BFS from root (node 0); spread leaves evenly per level.
  const level = new Array<number>(g.nodes.length).fill(0)
  const order: number[][] = Array.from({ length: levels }, () => [])
  const dist = bfsDistances(g, 0)
  for (let i = 0; i < g.nodes.length; i++) {
    const lv = Math.min(dist[i] === Infinity ? 0 : dist[i], levels - 1)
    level[i] = lv
    order[lv].push(i)
  }
  const pos: Pos[] = new Array(g.nodes.length)
  for (let lv = 0; lv < levels; lv++) {
    const row = order[lv]
    row.forEach((id, idx) => {
      pos[id] = {
        x: row.length === 1 ? 0.5 : idx / (row.length - 1),
        y: levels === 1 ? 0.5 : lv / (levels - 1),
      }
    })
  }
  // guard: branching unused dimension kept for API symmetry
  void branching
  return normalize(pos)
}

const HYPERCUBE_DIRS: Pos[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: 0.55, y: 0.55 },
  { x: 2.6, y: 0 },
  { x: 0, y: 2.6 },
  { x: 1.4, y: 1.4 },
]

export function layoutHypercube(d: number): Pos[] {
  const n = 1 << d
  const pts: Pos[] = []
  for (let i = 0; i < n; i++) {
    let x = 0
    let y = 0
    for (let bit = 0; bit < d; bit++) {
      if (i & (1 << bit)) {
        const dir = HYPERCUBE_DIRS[bit % HYPERCUBE_DIRS.length]
        x += dir.x
        y += dir.y
      }
    }
    pts.push({ x, y })
  }
  return normalize(pts)
}

export const edgeKey = (u: number, v: number): string =>
  `${Math.min(u, v)}-${Math.max(u, v)}`

export interface BisectionCut {
  left: Set<number>
  cutEdges: Set<string>
  count: number
}

/** Subtree node set rooted at `node`, not crossing back through `parent`. */
function subtreeSet(g: Graph, parent: number, node: number): Set<number> {
  const seen = new Set<number>([node])
  const stack = [node]
  while (stack.length) {
    const u = stack.pop()!
    for (const v of g.adj[u]) {
      if (v !== parent && !seen.has(v)) {
        seen.add(v)
        stack.push(v)
      }
    }
  }
  return seen
}

/**
 * A concrete balanced partition whose cut realises the bisection width — used
 * to HIGHLIGHT the crossing links. Choices mirror the textbook formulas.
 */
export function bisectionPartition(g: Graph, kind: TopologyKind, p: TopologyParams): BisectionCut {
  const n = g.nodes.length
  let side: (id: number) => boolean
  if (kind === 'mesh' || kind === 'torus') {
    if (p.w >= p.h) side = (id) => id % p.w < Math.floor(p.w / 2)
    else side = (id) => Math.floor(id / p.w) < Math.floor(p.h / 2)
  } else if (kind === 'hypercube') {
    const top = 1 << (p.d - 1)
    side = (id) => (id & top) === 0
  } else if (kind === 'star') {
    const leftCount = Math.ceil(n / 2) // center + some leaves
    side = (id) => id < leftCount
  } else if (kind === 'tree' && g.adj[0].length > 0) {
    const sub = subtreeSet(g, 0, g.adj[0][0])
    side = (id) => sub.has(id)
  } else {
    const half = Math.floor(n / 2)
    side = (id) => id < half
  }
  const left = new Set<number>()
  for (let i = 0; i < n; i++) if (side(i)) left.add(i)
  const cutEdges = new Set<string>()
  for (const e of g.edges) if (side(e.u) !== side(e.v)) cutEdges.add(edgeKey(e.u, e.v))
  return { left, cutEdges, count: cutEdges.size }
}

export function layoutFor(kind: TopologyKind, p: TopologyParams, g: Graph): Pos[] {
  switch (kind) {
    case 'linear':
      return layoutLine(p.n)
    case 'ring':
      return layoutCircle(p.n)
    case 'mesh':
    case 'torus':
      return layoutGrid(p.w, p.h)
    case 'star':
      return layoutStar(p.n)
    case 'full':
      return layoutCircle(p.n)
    case 'tree':
      return layoutTree(g, p.levels, p.branching)
    case 'hypercube':
      return layoutHypercube(p.d)
  }
}
