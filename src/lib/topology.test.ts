import { describe, it, expect } from 'vitest'
import {
  buildLinear,
  buildRing,
  buildMesh,
  buildTorus,
  buildStar,
  buildFull,
  buildTree,
  buildHypercube,
  buildGraph,
  degreeStats,
  diameter,
  bisectionWidth,
  avgPathLength,
  isConnected,
  isSymmetric,
  type Graph,
  type TopologyKind,
} from './topology'

const everyGraph: Array<[string, Graph, TopologyKind]> = [
  ['linear-8', buildLinear(8), 'linear'],
  ['ring-8', buildRing(8), 'ring'],
  ['mesh-4x4', buildMesh(4, 4), 'mesh'],
  ['torus-4x4', buildTorus(4, 4), 'torus'],
  ['star-9', buildStar(9), 'star'],
  ['full-6', buildFull(6), 'full'],
  ['tree-4lvl', buildTree(4, 2), 'tree'],
  ['hypercube-4', buildHypercube(4), 'hypercube'],
]

describe('generators — connected, symmetric, no self-loops', () => {
  for (const [name, g] of everyGraph) {
    it(`${name} is connected and symmetric`, () => {
      expect(isConnected(g)).toBe(true)
      expect(isSymmetric(g)).toBe(true)
      for (let i = 0; i < g.adj.length; i++) expect(g.adj[i]).not.toContain(i)
    })
  }
})

describe('linear array', () => {
  it('degree 1..2, diameter n−1', () => {
    const g = buildLinear(6)
    const deg = degreeStats(g)
    expect(deg.min).toBe(1)
    expect(deg.max).toBe(2)
    expect(diameter(g).diameter).toBe(5)
    expect(bisectionWidth(g, 'linear').value).toBe(1)
  })
})

describe('ring', () => {
  it('degree 2, diameter ⌊n/2⌋, bisection 2', () => {
    for (const n of [6, 7, 8, 9]) {
      const g = buildRing(n)
      const deg = degreeStats(g)
      expect(deg.min).toBe(2)
      expect(deg.max).toBe(2)
      expect(diameter(g).diameter).toBe(Math.floor(n / 2))
      expect(bisectionWidth(g, 'ring').value).toBe(2)
    }
  })
})

describe('full mesh (clique)', () => {
  it('degree n−1, diameter 1, edges n(n−1)/2', () => {
    for (const n of [4, 5, 8]) {
      const g = buildFull(n)
      const deg = degreeStats(g)
      expect(deg.min).toBe(n - 1)
      expect(deg.max).toBe(n - 1)
      expect(diameter(g).diameter).toBe(1)
      expect(g.edges).toHaveLength((n * (n - 1)) / 2)
      expect(bisectionWidth(g, 'full').value).toBe(Math.floor(n / 2) * Math.ceil(n / 2))
    }
  })
})

describe('hypercube', () => {
  it('2^d nodes, degree d, diameter d, bisection 2^(d−1)', () => {
    for (const d of [1, 2, 3, 4, 5]) {
      const g = buildHypercube(d)
      expect(g.nodes).toHaveLength(1 << d)
      const deg = degreeStats(g)
      expect(deg.min).toBe(d)
      expect(deg.max).toBe(d)
      expect(diameter(g).diameter).toBe(d)
      expect(bisectionWidth(g, 'hypercube').value).toBe((1 << d) / 2)
    }
  })

  it('labels are d-bit binary codes; neighbours differ in exactly one bit', () => {
    const d = 3
    const g = buildHypercube(d)
    expect(g.nodes[5].label).toBe('101')
    for (let i = 0; i < g.nodes.length; i++) {
      for (const j of g.adj[i]) {
        const diff = (i ^ j).toString(2).split('').filter((c) => c === '1').length
        expect(diff).toBe(1)
      }
    }
  })
})

describe('2D mesh and torus', () => {
  it('mesh k×k: corner degree 2, interior degree 4, diameter 2(k−1)', () => {
    const g = buildMesh(4, 4)
    const deg = degreeStats(g)
    expect(deg.min).toBe(2) // corners
    expect(deg.max).toBe(4) // interior
    expect(diameter(g).diameter).toBe(2 * (4 - 1))
    expect(bisectionWidth(g, 'mesh', { ...P, w: 4, h: 4 }).value).toBe(4)
  })

  it('torus k×k: every node degree 4, diameter 2·⌊k/2⌋, bisection 2k', () => {
    const g = buildTorus(4, 4)
    const deg = degreeStats(g)
    expect(deg.min).toBe(4)
    expect(deg.max).toBe(4)
    expect(diameter(g).diameter).toBe(2 * Math.floor(4 / 2))
    expect(bisectionWidth(g, 'torus', { ...P, w: 4, h: 4 }).value).toBe(8)
  })
})

describe('star', () => {
  it('center degree n−1, leaves degree 1, diameter 2', () => {
    const g = buildStar(7)
    const deg = degreeStats(g)
    expect(deg.max).toBe(6)
    expect(deg.maxNode).toBe(0)
    expect(deg.min).toBe(1)
    expect(diameter(g).diameter).toBe(2)
  })
})

describe('tree', () => {
  it('complete binary tree of L levels has 2^L−1 nodes and diameter 2(L−1)', () => {
    for (const L of [2, 3, 4]) {
      const g = buildTree(L, 2)
      expect(g.nodes).toHaveLength((1 << L) - 1)
      expect(diameter(g).diameter).toBe(2 * (L - 1))
      expect(bisectionWidth(g, 'tree').value).toBe(1)
    }
  })
})

describe('avgPathLength + buildGraph dispatch', () => {
  it('full mesh has average path length 1', () => {
    expect(avgPathLength(buildFull(5))).toBe(1)
  })
  it('buildGraph routes each kind', () => {
    const g = buildGraph('hypercube', { ...P, d: 3 })
    expect(g.nodes).toHaveLength(8)
  })
})

const P = { n: 8, w: 4, h: 4, levels: 4, branching: 2, d: 3 }
