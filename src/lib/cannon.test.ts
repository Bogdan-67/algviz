import { describe, it, expect } from 'vitest'
import {
  randomMatrix,
  naiveMultiply,
  skew,
  buildCannonSnapshots,
  matricesEqual,
  cloneMatrix,
  type Matrix,
} from './cannon'

/** Extract the final C matrix from the last snapshot. */
function cannonResult(A: Matrix, B: Matrix): Matrix {
  const snaps = buildCannonSnapshots(A, B)
  const last = snaps[snaps.length - 1]
  return last.processors.map((row) => row.map((p) => p.c))
}

describe('naiveMultiply', () => {
  it('multiplies a known 2×2 case', () => {
    const A = [
      [1, 2],
      [3, 4],
    ]
    const B = [
      [5, 6],
      [7, 8],
    ]
    expect(naiveMultiply(A, B)).toEqual([
      [19, 22],
      [43, 50],
    ])
  })

  it('multiplies by the identity unchanged', () => {
    const A = [
      [2, 7],
      [1, 9],
    ]
    const I = [
      [1, 0],
      [0, 1],
    ]
    expect(naiveMultiply(A, I)).toEqual(A)
  })
})

describe('skew', () => {
  it('aligns A rows left-by-i and B columns up-by-j for N=3', () => {
    const A = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
    ]
    const B = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
    ]
    const { A: sA, B: sB } = skew(A, B)
    // Row 0 unchanged, row 1 left by 1, row 2 left by 2.
    expect(sA).toEqual([
      [0, 1, 2],
      [4, 5, 3],
      [8, 6, 7],
    ])
    // Col 0 unchanged, col 1 up by 1, col 2 up by 2.
    expect(sB).toEqual([
      [0, 4, 8],
      [3, 7, 2],
      [6, 1, 5],
    ])
  })

  it('does not mutate the input matrices', () => {
    const A = [
      [1, 2],
      [3, 4],
    ]
    const before = cloneMatrix(A)
    skew(A, A)
    expect(A).toEqual(before)
  })
})

describe('buildCannonSnapshots — correctness vs naive', () => {
  for (const n of [2, 3, 4, 5]) {
    it(`final C equals naiveMultiply for N=${n} (fixed sequential matrices)`, () => {
      // Deterministic non-trivial matrices.
      const A: Matrix = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => i * n + j),
      )
      const B: Matrix = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => (i + 1) * (j + 2)),
      )
      expect(matricesEqual(cannonResult(A, B), naiveMultiply(A, B))).toBe(true)
    })

    it(`final C equals naiveMultiply for N=${n} across random matrices`, () => {
      for (let trial = 0; trial < 20; trial++) {
        const A = randomMatrix(n, 0, 9)
        const B = randomMatrix(n, -5, 9)
        expect(matricesEqual(cannonResult(A, B), naiveMultiply(A, B))).toBe(true)
      }
    })
  }
})

describe('buildCannonSnapshots — full UI size range (up to N=16)', () => {
  for (const n of [6, 7, 8, 10, 12, 16]) {
    it(`final C equals naiveMultiply for N=${n} across random matrices`, () => {
      for (let trial = 0; trial < 10; trial++) {
        const A = randomMatrix(n, 0, 9)
        const B = randomMatrix(n, -3, 9)
        expect(matricesEqual(cannonResult(A, B), naiveMultiply(A, B))).toBe(true)
      }
    })
  }
})

describe('buildCannonSnapshots — structure', () => {
  it('produces exactly N+2 snapshots', () => {
    for (const n of [2, 3, 5, 8]) {
      const A = randomMatrix(n)
      const B = randomMatrix(n)
      expect(buildCannonSnapshots(A, B)).toHaveLength(n + 2)
    }
  })

  it('initial and skew steps have empty accumulators', () => {
    const A = randomMatrix(4)
    const B = randomMatrix(4)
    const snaps = buildCannonSnapshots(A, B)
    for (const idx of [0, 1]) {
      for (const row of snaps[idx].processors) {
        for (const p of row) {
          expect(p.terms).toHaveLength(0)
          expect(p.c).toBe(0)
        }
      }
    }
  })

  it('each processor accumulates exactly N terms by the final step', () => {
    const n = 5
    const snaps = buildCannonSnapshots(randomMatrix(n), randomMatrix(n))
    const last = snaps[snaps.length - 1]
    expect(last.complete).toBe(true)
    for (const row of last.processors) {
      for (const p of row) {
        expect(p.terms).toHaveLength(n)
        // The shared index m must cover every value 0..n-1 exactly once.
        const ms = p.terms.map((t) => t.m).sort((x, y) => x - y)
        expect(ms).toEqual([...Array(n).keys()])
      }
    }
  })

  it('the running sum c matches the sum of accumulated products at every step', () => {
    const snaps = buildCannonSnapshots(randomMatrix(6), randomMatrix(6))
    for (const snap of snaps) {
      for (const row of snap.processors) {
        for (const p of row) {
          const sum = p.terms.reduce((acc, t) => acc + t.product, 0)
          expect(p.c).toBe(sum)
        }
      }
    }
  })

  it('held operands on multiply step k are A[i][(i+j+k)%n] and B[(i+j+k)%n][j]', () => {
    const n = 4
    const A = randomMatrix(n)
    const B = randomMatrix(n)
    const snaps = buildCannonSnapshots(A, B)
    for (let k = 0; k < n; k++) {
      const snap = snaps[k + 2]
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const m = (i + j + k) % n
          const p = snap.processors[i][j]
          expect(p.a).toBe(A[i][m])
          expect(p.b).toBe(B[m][j])
        }
      }
    }
  })
})
