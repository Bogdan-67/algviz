import { describe, it, expect } from 'vitest'
import {
  randomMatrix,
  naiveMultiply,
  skew,
  buildCannonSnapshots,
  matricesEqual,
  cloneMatrix,
  divisors,
  splitIntoBlocks,
  assembleBlocks,
  blockMultiply,
  blockMultiplyAccumulate,
  finalC,
  zeroBlock,
  type Matrix,
} from './cannon'

/** Final assembled C from the block Cannon run with grid dimension q. */
function cannonResult(A: Matrix, B: Matrix, q?: number): Matrix {
  return finalC(buildCannonSnapshots(A, B, q))
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
})

describe('divisors', () => {
  it('lists all divisors (valid grid dimensions q)', () => {
    expect(divisors(8)).toEqual([1, 2, 4, 8])
    expect(divisors(6)).toEqual([1, 2, 3, 6])
    expect(divisors(7)).toEqual([1, 7])
    expect(divisors(1)).toEqual([1])
  })
})

describe('block utilities', () => {
  it('splitIntoBlocks / assembleBlocks round-trips', () => {
    const M = [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
    ]
    for (const q of [1, 2, 4]) {
      const blocks = splitIntoBlocks(M, q)
      expect(blocks).toHaveLength(q)
      expect(blocks[0][0]).toHaveLength(M.length / q)
      expect(assembleBlocks(blocks)).toEqual(M)
    }
  })

  it('splitIntoBlocks extracts the correct 2×2 sub-matrix', () => {
    const M = [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
    ]
    const blocks = splitIntoBlocks(M, 2)
    expect(blocks[0][1]).toEqual([
      [3, 4],
      [7, 8],
    ])
    expect(blocks[1][0]).toEqual([
      [9, 10],
      [13, 14],
    ])
  })

  it('blockMultiply matches a known case', () => {
    const A = [
      [1, 2],
      [3, 4],
    ]
    const B = [
      [5, 6],
      [7, 8],
    ]
    expect(blockMultiply(A, B)).toEqual([
      [19, 22],
      [43, 50],
    ])
  })

  it('blockMultiplyAccumulate adds the product to the accumulator immutably', () => {
    const acc = zeroBlock(2)
    const A = [
      [1, 0],
      [0, 1],
    ]
    const out = blockMultiplyAccumulate(acc, A, A)
    expect(out).toEqual(A)
    expect(acc).toEqual(zeroBlock(2)) // unchanged
  })

  it('splitIntoBlocks throws when q does not divide N', () => {
    expect(() => splitIntoBlocks(randomMatrix(5), 2)).toThrow()
  })
})

describe('skew (element-level / q = N)', () => {
  it('aligns A rows left-by-i and B columns up-by-j for N=3', () => {
    const A = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
    ]
    const { A: sA, B: sB } = skew(A, A)
    expect(sA).toEqual([
      [0, 1, 2],
      [4, 5, 3],
      [8, 6, 7],
    ])
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

describe('buildCannonSnapshots — block correctness vs naive', () => {
  const cases: Array<[number, number[]]> = [
    [4, [1, 2, 4]],
    [6, [1, 2, 3, 6]],
    [8, [1, 2, 4, 8]],
  ]
  for (const [n, qs] of cases) {
    for (const q of qs) {
      it(`final C equals naiveMultiply for N=${n}, q=${q} (fixed matrices)`, () => {
        const A: Matrix = Array.from({ length: n }, (_, i) =>
          Array.from({ length: n }, (_, j) => i * n + j),
        )
        const B: Matrix = Array.from({ length: n }, (_, i) =>
          Array.from({ length: n }, (_, j) => (i + 1) * (j + 2)),
        )
        expect(matricesEqual(cannonResult(A, B, q), naiveMultiply(A, B))).toBe(true)
      })

      it(`final C equals naiveMultiply for N=${n}, q=${q} (random matrices)`, () => {
        for (let trial = 0; trial < 15; trial++) {
          const A = randomMatrix(n, 0, 9)
          const B = randomMatrix(n, -4, 9)
          expect(matricesEqual(cannonResult(A, B, q), naiveMultiply(A, B))).toBe(true)
        }
      })
    }
  }
})

describe('buildCannonSnapshots — mode-equivalence invariant', () => {
  // Block result for ANY valid q must equal the element-wise result (q = N).
  const cases: Array<[number, number[]]> = [
    [4, [1, 2]],
    [6, [1, 2, 3]],
    [8, [1, 2, 4]],
    [12, [1, 2, 3, 4, 6]],
  ]
  for (const [n, qs] of cases) {
    it(`q ∈ {${qs.join(',')}} all match the element mode q=${n} for N=${n}`, () => {
      for (let trial = 0; trial < 8; trial++) {
        const A = randomMatrix(n, 0, 9)
        const B = randomMatrix(n, 0, 9)
        const elementMode = cannonResult(A, B, n) // q = N, block 1×1
        for (const q of qs) {
          expect(matricesEqual(cannonResult(A, B, q), elementMode)).toBe(true)
        }
      }
    })
  }
})

describe('buildCannonSnapshots — defaults & q=1', () => {
  it('defaults to element mode (q = N) when q omitted', () => {
    const A = randomMatrix(4)
    const B = randomMatrix(4)
    const def = buildCannonSnapshots(A, B)
    expect(def[0].q).toBe(4)
    expect(def[0].b).toBe(1)
    expect(matricesEqual(finalC(def), naiveMultiply(A, B))).toBe(true)
  })

  it('q=1 is a single processor doing the whole multiply in 1 step', () => {
    const A = randomMatrix(6)
    const B = randomMatrix(6)
    const snaps = buildCannonSnapshots(A, B, 1)
    expect(snaps).toHaveLength(3) // initial + skew + 1 multiply
    const last = snaps[snaps.length - 1]
    expect(last.processors[0][0].c).toEqual(naiveMultiply(A, B))
  })

  it('throws when q does not divide N', () => {
    expect(() => buildCannonSnapshots(randomMatrix(5), randomMatrix(5), 2)).toThrow()
  })
})

describe('buildCannonSnapshots — structure', () => {
  it('produces exactly q+2 snapshots (q steps, not N)', () => {
    for (const [n, q] of [
      [8, 2],
      [8, 4],
      [6, 3],
      [12, 4],
    ] as Array<[number, number]>) {
      expect(buildCannonSnapshots(randomMatrix(n), randomMatrix(n), q)).toHaveLength(q + 2)
    }
  })

  it('initial and skew steps have empty accumulators', () => {
    const snaps = buildCannonSnapshots(randomMatrix(8), randomMatrix(8), 4)
    for (const idx of [0, 1]) {
      for (const row of snaps[idx].processors) {
        for (const p of row) {
          expect(p.terms).toHaveLength(0)
          expect(p.c).toEqual(zeroBlock(2))
        }
      }
    }
  })

  it('each processor accumulates exactly q block products; K covers 0..q-1', () => {
    const q = 4
    const snaps = buildCannonSnapshots(randomMatrix(8), randomMatrix(8), q)
    const last = snaps[snaps.length - 1]
    expect(last.complete).toBe(true)
    for (const row of last.processors) {
      for (const p of row) {
        expect(p.terms).toHaveLength(q)
        const ks = p.terms.map((t) => t.K).sort((x, y) => x - y)
        expect(ks).toEqual([...Array(q).keys()])
      }
    }
  })

  it('held blocks on multiply step k are A[I][(I+J+k)%q] and B[(I+J+k)%q][J]', () => {
    const n = 8
    const q = 4
    const A = randomMatrix(n)
    const B = randomMatrix(n)
    const ablocks = splitIntoBlocks(A, q)
    const bblocks = splitIntoBlocks(B, q)
    const snaps = buildCannonSnapshots(A, B, q)
    for (let k = 0; k < q; k++) {
      const snap = snaps[k + 2]
      for (let I = 0; I < q; I++) {
        for (let J = 0; J < q; J++) {
          const K = (I + J + k) % q
          const p = snap.processors[I][J]
          expect(p.blockA).toEqual(ablocks[I][K])
          expect(p.blockB).toEqual(bblocks[K][J])
        }
      }
    }
  })
})
