// Cannon's algorithm — pure, framework-free implementation (BLOCK form).
//
// The matrices are tiled into a q×q grid of b×b blocks (b = N / q). Each
// logical processor P(I,J) holds one block of A and one block of B and
// accumulates one block of C. The element-wise version of the algorithm is
// simply the special case q = N (block size 1×1); q = 1 is one processor doing
// an ordinary sequential N×N multiply.
//
// This is a SIMULATION: the algorithm is precomputed into an array of immutable
// "snapshots" (one per step) and the UI just switches the active index, so
// stepping forward/backward is fully deterministic. No real OS threads run.

export type Matrix = number[][]
/** A b×b sub-matrix held/produced by a processor. */
export type Block = number[][]

/** One block held by a processor, annotated with its origin block coords. */
export interface BlockCell {
  block: Block
  /** Origin block coordinates in the original q×q tiling (animation identity). */
  originRow: number
  originCol: number
}

/** A single block product A_block · B_block added to an accumulator. */
export interface BlockTerm {
  /** The shared block index K so that the term is A[I][K]·B[K][J]. */
  K: number
  blockA: Block
  blockB: Block
  product: Block
}

export interface ProcessorState {
  /** Block-grid coordinates (I, J), each 0..q-1. */
  i: number
  j: number
  /** Currently held blocks. */
  blockA: Block
  blockB: Block
  /** Origin block column of the held A block (its block row is always i). */
  aOriginCol: number
  /** Origin block row of the held B block (its block column is always j). */
  bOriginRow: number
  /** Block products accumulated so far, in order. */
  terms: BlockTerm[]
  /** Running block sum = Σ terms.product. */
  c: Block
  /** Index into `terms` of the product added on this step, or -1. */
  justAdded: number
}

export type StepKind = 'initial' | 'skew' | 'multiply'

export interface Snapshot {
  index: number
  kind: StepKind
  /** Multiply iteration (0..q-1); -1 for the initial/skew steps. */
  k: number
  /** Grid dimension (processors per side). */
  q: number
  /** Block size (b = N / q). */
  b: number
  /** Matrix dimension. */
  n: number
  /** processors[I][J] */
  processors: ProcessorState[][]
  /** Current layout of A as a q×q grid of held blocks. */
  matrixA: BlockCell[][]
  /** Current layout of B as a q×q grid of held blocks. */
  matrixB: BlockCell[][]
  /** Accumulated C so far as q×q blocks; null where nothing added yet. */
  matrixC: (Block | null)[][]
  /** Whether every processor has finished all q block products. */
  complete: boolean
  /** Whether A·B is actively being multiplied on this step. */
  multiplying: boolean
  caption: string
}

const mod = (x: number, n: number): number => ((x % n) + n) % n

const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min

/** Random N×N matrix of integers in [min, max]. */
export function randomMatrix(n: number, min = 0, max = 9): Matrix {
  return Array.from({ length: n }, () =>
    Array.from({ length: n }, () => randInt(min, max)),
  )
}

/** Deep copy of a matrix. */
export function cloneMatrix(m: Matrix): Matrix {
  return m.map((row) => row.slice())
}

/** All positive divisors of n (the valid grid dimensions q). */
export function divisors(n: number): number[] {
  const out: number[] = []
  for (let d = 1; d <= n; d++) if (n % d === 0) out.push(d)
  return out
}

/** Naive triple-loop multiply — the source of truth for self-checking. */
export function naiveMultiply(A: Matrix, B: Matrix): Matrix {
  const n = A.length
  const C: Matrix = Array.from({ length: n }, () => Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0
      for (let m = 0; m < n; m++) sum += A[i][m] * B[m][j]
      C[i][j] = sum
    }
  }
  return C
}

/** Compare two matrices element-by-element. */
export function matricesEqual(X: Matrix, Y: Matrix): boolean {
  if (X.length !== Y.length) return false
  for (let i = 0; i < X.length; i++) {
    if (X[i].length !== Y[i].length) return false
    for (let j = 0; j < X[i].length; j++) {
      if (X[i][j] !== Y[i][j]) return false
    }
  }
  return true
}

/**
 * Tile an N×N matrix into a q×q grid of b×b blocks (b = N / q).
 * Block (I,J) holds elements M[I·b .. I·b+b-1][J·b .. J·b+b-1].
 */
export function splitIntoBlocks(M: Matrix, q: number): Block[][] {
  const n = M.length
  if (n % q !== 0) {
    throw new Error(`splitIntoBlocks: q=${q} does not divide N=${n}`)
  }
  const b = n / q
  return Array.from({ length: q }, (_, I) =>
    Array.from({ length: q }, (_, J) =>
      Array.from({ length: b }, (_, r) =>
        Array.from({ length: b }, (_, c) => M[I * b + r][J * b + c]),
      ),
    ),
  )
}

/** Reassemble a q×q grid of b×b blocks back into one N×N matrix. */
export function assembleBlocks(grid: Block[][]): Matrix {
  const q = grid.length
  const b = grid[0][0].length
  const n = q * b
  const M: Matrix = Array.from({ length: n }, () => Array(n).fill(0))
  for (let I = 0; I < q; I++) {
    for (let J = 0; J < q; J++) {
      const blk = grid[I][J]
      for (let r = 0; r < b; r++) {
        for (let c = 0; c < b; c++) M[I * b + r][J * b + c] = blk[r][c]
      }
    }
  }
  return M
}

/** b×b zero block. */
export function zeroBlock(b: number): Block {
  return Array.from({ length: b }, () => Array(b).fill(0))
}

/** Element-wise block addition (immutable). */
export function addBlocks(X: Block, Y: Block): Block {
  return X.map((row, i) => row.map((v, j) => v + Y[i][j]))
}

/** Ordinary b×b matrix multiply of two blocks. */
export function blockMultiply(A: Block, B: Block): Block {
  const b = A.length
  const C: Block = zeroBlock(b)
  for (let i = 0; i < b; i++) {
    for (let j = 0; j < b; j++) {
      let sum = 0
      for (let k = 0; k < b; k++) sum += A[i][k] * B[k][j]
      C[i][j] = sum
    }
  }
  return C
}

/** Returns a new accumulator block = acc + A·B. */
export function blockMultiplyAccumulate(acc: Block, A: Block, B: Block): Block {
  return addBlocks(acc, blockMultiply(A, B))
}

/**
 * Element-level skew (kept for the q = N case and conceptual reference):
 *  - A: row i shifted cyclically left by i  → newA[i][j] = A[i][(j + i) % n]
 *  - B: col j shifted cyclically up   by j  → newB[i][j] = B[(i + j) % n][j]
 */
export function skew(A: Matrix, B: Matrix): { A: Matrix; B: Matrix } {
  const n = A.length
  const sA: Matrix = Array.from({ length: n }, () => Array(n).fill(0))
  const sB: Matrix = Array.from({ length: n }, () => Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sA[i][j] = A[i][mod(j + i, n)]
      sB[i][j] = B[mod(i + j, n)][j]
    }
  }
  return { A: sA, B: sB }
}

/**
 * Build all snapshots for the block-form animation.
 *
 * @param A,B  N×N matrices.
 * @param q    grid dimension (processors per side); must divide N.
 *             Defaults to N (the element-wise mode, block size 1×1).
 *
 * Snapshots:
 *  - index 0:        initial layout (processors hold block A[I][J], B[I][J])
 *  - index 1:        block skew / alignment (no products yet)
 *  - index 2..q+1:   q multiply-and-shift steps (k = 0..q-1)
 *
 * On multiply step k, P(I,J) multiplies the held blocks
 *   A[I][(I+J+k) % q] and B[(I+J+k) % q][J]
 * so that over k = 0..q-1 the shared block index K = (I+J+k) % q covers all of
 * 0..q-1 and Σ_K A[I][K]·B[K][J] = C[I][J]. The number of steps is q, NOT N.
 */
export function buildCannonSnapshots(A: Matrix, B: Matrix, q?: number): Snapshot[] {
  const n = A.length
  const grid = q ?? n
  if (grid < 1 || n % grid !== 0) {
    throw new Error(`buildCannonSnapshots: q=${grid} must be a positive divisor of N=${n}`)
  }
  const b = n / grid

  const ablocks = splitIntoBlocks(A, grid)
  const bblocks = splitIntoBlocks(B, grid)

  // held A block: A[I][(I+J+s) % q]; held B block: B[(I+J+s) % q][J].
  const heldACol = (I: number, J: number, s: number) => mod(I + J + s, grid)
  const heldBRow = (I: number, J: number, s: number) => mod(I + J + s, grid)

  // Accumulated block products per processor, growing as steps progress.
  const termsByProc: BlockTerm[][][] = Array.from({ length: grid }, () =>
    Array.from({ length: grid }, () => [] as BlockTerm[]),
  )

  const accOf = (I: number, J: number): Block =>
    termsByProc[I][J].reduce((acc, t) => addBlocks(acc, t.product), zeroBlock(b))

  const makeProcessors = (s: number, skewed: boolean, justAdded: number): ProcessorState[][] =>
    Array.from({ length: grid }, (_, I) =>
      Array.from({ length: grid }, (_, J) => {
        const aCol = skewed ? heldACol(I, J, s) : J
        const bRow = skewed ? heldBRow(I, J, s) : I
        const terms = termsByProc[I][J]
        return {
          i: I,
          j: J,
          blockA: ablocks[I][aCol],
          blockB: bblocks[bRow][J],
          aOriginCol: aCol,
          bOriginRow: bRow,
          terms: terms.slice(),
          c: accOf(I, J),
          justAdded: terms.length > 0 ? justAdded : -1,
        }
      }),
    )

  const buildMatrixA = (s: number, skewed: boolean): BlockCell[][] =>
    Array.from({ length: grid }, (_, I) =>
      Array.from({ length: grid }, (_, J) => {
        const col = skewed ? heldACol(I, J, s) : J
        return { block: ablocks[I][col], originRow: I, originCol: col }
      }),
    )

  const buildMatrixB = (s: number, skewed: boolean): BlockCell[][] =>
    Array.from({ length: grid }, (_, I) =>
      Array.from({ length: grid }, (_, J) => {
        const row = skewed ? heldBRow(I, J, s) : I
        return { block: bblocks[row][J], originRow: row, originCol: J }
      }),
    )

  const buildMatrixC = (): (Block | null)[][] =>
    Array.from({ length: grid }, (_, I) =>
      Array.from({ length: grid }, (_, J) =>
        termsByProc[I][J].length === 0 ? null : accOf(I, J),
      ),
    )

  const dims = `Матрица ${n}×${n}, сетка ${grid}×${grid} процессоров, блок ${b}×${b}.`
  const snapshots: Snapshot[] = []

  // index 0: initial layout
  snapshots.push({
    index: 0,
    kind: 'initial',
    k: -1,
    q: grid,
    b,
    n,
    processors: makeProcessors(0, false, -1),
    matrixA: buildMatrixA(0, false),
    matrixB: buildMatrixB(0, false),
    matrixC: buildMatrixC(),
    complete: false,
    multiplying: false,
    caption: `Исходная раскладка. ${dims} Каждый процессор держит свои блоки A и B; накопители пусты.`,
  })

  // index 1: block skew / alignment
  snapshots.push({
    index: 1,
    kind: 'skew',
    k: -1,
    q: grid,
    b,
    n,
    processors: makeProcessors(0, true, -1),
    matrixA: buildMatrixA(0, true),
    matrixB: buildMatrixB(0, true),
    matrixC: buildMatrixC(),
    complete: false,
    multiplying: false,
    caption: `Выравнивание блоков: строка блоков I матрицы A сдвинута влево на I, столбец блоков J матрицы B — вверх на J.`,
  })

  // indices 2..q+1: multiply-and-shift, k = 0..q-1
  for (let k = 0; k < grid; k++) {
    for (let I = 0; I < grid; I++) {
      for (let J = 0; J < grid; J++) {
        const K = heldACol(I, J, k) // == heldBRow(I, J, k)
        const blockA = ablocks[I][K]
        const blockB = bblocks[K][J]
        termsByProc[I][J].push({ K, blockA, blockB, product: blockMultiply(blockA, blockB) })
      }
    }
    const complete = k === grid - 1
    snapshots.push({
      index: k + 2,
      kind: 'multiply',
      k,
      q: grid,
      b,
      n,
      processors: makeProcessors(k, true, k),
      matrixA: buildMatrixA(k, true),
      matrixB: buildMatrixB(k, true),
      matrixC: buildMatrixC(),
      complete,
      multiplying: true,
      caption: complete
        ? `Шаг умножения ${k + 1} из ${grid}: последнее C(I,J) += A·B (умножение блоков ${b}×${b}). Матрица C собрана из блоков — слияния между процессорами нет.`
        : `Шаг умножения ${k + 1} из ${grid}: каждый процессор делает C(I,J) += A·B (блоки ${b}×${b}), затем блоки A сдвигаются влево, B — вверх (по тору).`,
    })
  }

  return snapshots
}

/** Final assembled C (N×N) from a snapshot array — convenience for checks/tests. */
export function finalC(snapshots: Snapshot[]): Matrix {
  const last = snapshots[snapshots.length - 1]
  return assembleBlocks(last.processors.map((row) => row.map((p) => p.c)))
}
