// Cannon's algorithm — pure, framework-free implementation.
//
// Element-wise mapping onto an N×N grid of processors (block size = 1).
// Processor P(i,j) accumulates C(i,j). This is correct for ANY N — it does
// not require the processor count to be a perfect square or N to be divisible
// by a block size.
//
// The UI never runs the algorithm live: it precomputes an array of immutable
// "snapshots" (one per step) and the controls simply switch the active index.
// That makes stepping forward/backward fully deterministic.

export type Matrix = number[][]

/** One element held by a processor, annotated with where it came from. */
export interface CellState {
  value: number
  /** Origin coordinates in the ORIGINAL matrix (for stable animation identity). */
  originRow: number
  originCol: number
}

/** A single product a·b added to an accumulator. */
export interface Term {
  /** The shared index m so that the term is A[i][m]·B[m][j]. */
  m: number
  a: number
  b: number
  product: number
}

export interface ProcessorState {
  i: number
  j: number
  /** Currently held operands. */
  a: number
  b: number
  /** Origin column of the held `a` (its row is always i). */
  aOriginCol: number
  /** Origin row of the held `b` (its column is always j). */
  bOriginRow: number
  /** Products accumulated so far, in order. */
  terms: Term[]
  /** Running sum = Σ terms.product. */
  c: number
  /** Index into `terms` of the product added on this step, or -1. */
  justAdded: number
}

export type StepKind = 'initial' | 'skew' | 'multiply'

export interface Snapshot {
  index: number
  kind: StepKind
  /** Multiply iteration (0..N-1); -1 for the initial/skew steps. */
  k: number
  /** processors[i][j] */
  processors: ProcessorState[][]
  /** Current layout of A (grid of held `a` values). */
  matrixA: CellState[][]
  /** Current layout of B (grid of held `b` values). */
  matrixB: CellState[][]
  /** Accumulated C so far; null where nothing has been added yet. */
  matrixC: (number | null)[][]
  /** Whether every processor has finished all N products. */
  complete: boolean
  /** Whether a·b is actively being multiplied on this step. */
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

/**
 * Initial alignment (skew).
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
 * Build all snapshots for the animation:
 *  - index 0:        initial layout (processors hold A[i][j], B[i][j], no products)
 *  - index 1:        skew / alignment (no products yet)
 *  - index 2..N+1:   N multiply-and-shift steps (k = 0..N-1)
 *
 * On multiply step k, P(i,j) multiplies the held operands
 *   a = A[i][(i+j+k) % N] and b = B[(i+j+k) % N][j]
 * so that over k = 0..N-1 the shared index m = (i+j+k) % N covers all of
 * 0..N-1 and Σ A[i][m]·B[m][j] = C[i][j].
 */
export function buildCannonSnapshots(A: Matrix, B: Matrix): Snapshot[] {
  const n = A.length
  const snapshots: Snapshot[] = []

  // --- helpers that build per-step structures from the ORIGINAL matrices ---

  // The "configuration shift" s controls which element each processor holds:
  // held a = A[i][(i+j+s) % n], held b = B[(i+j+s) % n][j].
  // s = 0 for both skew and multiply k = 0; s = k for multiply step k.
  const heldACol = (i: number, j: number, s: number) => mod(i + j + s, n)
  const heldBRow = (i: number, j: number, s: number) => mod(i + j + s, n)

  const buildMatrixA = (s: number, skewed: boolean): CellState[][] =>
    Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        const col = skewed ? heldACol(i, j, s) : j
        return { value: A[i][col], originRow: i, originCol: col }
      }),
    )

  const buildMatrixB = (s: number, skewed: boolean): CellState[][] =>
    Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        const row = skewed ? heldBRow(i, j, s) : i
        return { value: B[row][j], originRow: row, originCol: j }
      }),
    )

  // Accumulate the products for every processor up to and including step k.
  // termsByProcessor[i][j] is the ordered list of products through step k.
  const termsByProcessor: Term[][][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => [] as Term[]),
  )

  const makeProcessors = (
    s: number,
    skewed: boolean,
    justAdded: number,
  ): ProcessorState[][] =>
    Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        const aCol = skewed ? heldACol(i, j, s) : j
        const bRow = skewed ? heldBRow(i, j, s) : i
        const terms = termsByProcessor[i][j]
        const c = terms.reduce((acc, t) => acc + t.product, 0)
        return {
          i,
          j,
          a: A[i][aCol],
          b: B[bRow][j],
          aOriginCol: aCol,
          bOriginRow: bRow,
          terms: terms.map((t) => ({ ...t })),
          c,
          justAdded: terms.length > 0 ? justAdded : -1,
        }
      }),
    )

  const buildMatrixC = (): (number | null)[][] =>
    Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        const terms = termsByProcessor[i][j]
        if (terms.length === 0) return null
        return terms.reduce((acc, t) => acc + t.product, 0)
      }),
    )

  // --- index 0: initial layout ---
  snapshots.push({
    index: 0,
    kind: 'initial',
    k: -1,
    processors: makeProcessors(0, false, -1),
    matrixA: buildMatrixA(0, false),
    matrixB: buildMatrixB(0, false),
    matrixC: buildMatrixC(),
    complete: false,
    multiplying: false,
    caption:
      'Исходная раскладка. Каждый процессор P(i,j) держит свои A(i,j) и B(i,j); накопители пусты.',
  })

  // --- index 1: skew / alignment ---
  snapshots.push({
    index: 1,
    kind: 'skew',
    k: -1,
    processors: makeProcessors(0, true, -1),
    matrixA: buildMatrixA(0, true),
    matrixB: buildMatrixB(0, true),
    matrixC: buildMatrixC(),
    complete: false,
    multiplying: false,
    caption:
      'Выравнивание: строка i матрицы A сдвинута влево на i, столбец j матрицы B — вверх на j.',
  })

  // --- indices 2..N+1: multiply-and-shift, k = 0..N-1 ---
  for (let k = 0; k < n; k++) {
    // Each processor multiplies its currently held a·b and accumulates it.
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const m = heldACol(i, j, k) // == heldBRow(i, j, k)
        const a = A[i][m]
        const b = B[m][j]
        termsByProcessor[i][j].push({ m, a, b, product: a * b })
      }
    }
    const justAdded = k // index of the freshly added term
    const complete = k === n - 1
    snapshots.push({
      index: k + 2,
      kind: 'multiply',
      k,
      processors: makeProcessors(k, true, justAdded),
      matrixA: buildMatrixA(k, true),
      matrixB: buildMatrixB(k, true),
      matrixC: buildMatrixC(),
      complete,
      multiplying: true,
      caption: complete
        ? `Шаг умножения ${k + 1} из ${n}: последнее C(i,j) += a·b. Матрица C готова — слияние между процессорами не требуется.`
        : `Шаг умножения ${k + 1} из ${n}: все процессоры делают C(i,j) += a·b, затем A сдвигается влево, B — вверх (по тору).`,
    })
  }

  return snapshots
}
