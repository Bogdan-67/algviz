import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buildCannonSnapshots,
  naiveMultiply,
  matricesEqual,
  randomMatrix,
  cloneMatrix,
  assembleBlocks,
  type Block,
  type Matrix,
} from './lib/cannon'
import { MIN_N, MAX_N, FULL_ANIM_MAX } from './lib/constants'
import { Controls } from './components/Controls'
import { ProcessorSelect } from './components/ProcessorSelect'
import { MatrixView } from './components/MatrixView'
import { ProcessorGrid } from './components/ProcessorGrid'
import { StepCaption } from './components/StepCaption'
import { ResultPanel } from './components/ResultPanel'

const clampN = (n: number) => Math.max(MIN_N, Math.min(MAX_N, Math.round(n)))

/** Assemble q×q (Block|null) grid into an N×N (number|null) matrix. */
function assembleCWithNulls(blocks: (Block | null)[][], b: number): (number | null)[][] {
  const q = blocks.length
  const n = q * b
  const out: (number | null)[][] = Array.from({ length: n }, () =>
    Array<number | null>(n).fill(null),
  )
  for (let I = 0; I < q; I++) {
    for (let J = 0; J < q; J++) {
      const blk = blocks[I][J]
      if (!blk) continue
      for (let r = 0; r < b; r++) {
        for (let c = 0; c < b; c++) out[I * b + r][J * b + c] = blk[r][c]
      }
    }
  }
  return out
}

export default function App() {
  const [n, setN] = useState(4)
  const [q, setQ] = useState(2) // grid dimension; p = q² processors
  const [A, setA] = useState<Matrix>(() => randomMatrix(4, 0, 9))
  const [B, setB] = useState<Matrix>(() => randomMatrix(4, 0, 9))
  const [stepIndex, setStepIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedMs, setSpeedMs] = useState(900)
  const [rangeMin, setRangeMin] = useState(0)
  const [rangeMax, setRangeMax] = useState(9)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  // Guard: q must divide N (transient states during updates fall back to element mode).
  const safeQ = n % q === 0 ? q : n
  const b = n / safeQ

  const snapshots = useMemo(() => buildCannonSnapshots(A, B, safeQ), [A, B, safeQ])
  const naiveC = useMemo(() => naiveMultiply(A, B), [A, B])
  const totalSteps = snapshots.length

  const finalCannonC = useMemo<Matrix>(
    () => assembleBlocks(snapshots[snapshots.length - 1].processors.map((row) => row.map((p) => p.c))),
    [snapshots],
  )
  const isCorrect = useMemo(() => matricesEqual(finalCannonC, naiveC), [finalCannonC, naiveC])

  const matrixCompact = n > FULL_ANIM_MAX
  const current = snapshots[Math.min(stepIndex, totalSteps - 1)]
  const atStart = stepIndex <= 0
  const atEnd = stepIndex >= totalSteps - 1
  const currentCFull = useMemo(
    () => assembleCWithNulls(current.matrixC, current.b),
    [current],
  )

  // --- theme ---
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [theme])

  // --- regenerate data ---
  const regenerate = useCallback(
    (size: number) => {
      const lo = Math.min(rangeMin, rangeMax)
      const hi = Math.max(rangeMin, rangeMax)
      setA(randomMatrix(size, lo, hi))
      setB(randomMatrix(size, lo, hi))
      setStepIndex(0)
      setIsPlaying(false)
      setExpandedKey(null)
    },
    [rangeMin, rangeMax],
  )

  const handleNChange = useCallback(
    (value: number) => {
      const next = clampN(value)
      setN(next)
      // Keep the current grid dimension if it still divides N, else element mode.
      setQ((prev) => (next % prev === 0 ? prev : next))
      regenerate(next)
    },
    [regenerate],
  )

  const handleQChange = useCallback((value: number) => {
    setQ(value)
    setStepIndex(0)
    setIsPlaying(false)
    setExpandedKey(null)
  }, [])

  const handleRandom = useCallback(() => regenerate(n), [regenerate, n])

  // --- step transport ---
  const goNext = useCallback(
    () => setStepIndex((s) => Math.min(s + 1, totalSteps - 1)),
    [totalSteps],
  )
  const goPrev = useCallback(() => setStepIndex((s) => Math.max(s - 1, 0)), [])
  const reset = useCallback(() => {
    setStepIndex(0)
    setIsPlaying(false)
  }, [])
  const togglePlay = useCallback(() => {
    setIsPlaying((p) => {
      if (!p && atEnd) setStepIndex(0)
      return !p
    })
  }, [atEnd])

  // --- auto-play ---
  useEffect(() => {
    if (!isPlaying) return
    if (atEnd) {
      setIsPlaying(false)
      return
    }
    const id = setTimeout(() => setStepIndex((s) => Math.min(s + 1, totalSteps - 1)), speedMs)
    return () => clearTimeout(id)
  }, [isPlaying, stepIndex, atEnd, speedMs, totalSteps])

  // --- keyboard ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT'))
        return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev, togglePlay])

  // --- cell editing (only meaningful at step 0) ---
  const editMatrix = useCallback(
    (which: 'A' | 'B', row: number, col: number, value: number) => {
      const setter = which === 'A' ? setA : setB
      setter((prev) => {
        const next = cloneMatrix(prev)
        next[row][col] = value
        return next
      })
      setStepIndex(0)
      setIsPlaying(false)
    },
    [],
  )

  const toggleExpand = useCallback(
    (key: string) => setExpandedKey((cur) => (cur === key ? null : key)),
    [],
  )

  const editable = stepIndex === 0
  const initial = snapshots[0]

  return (
    <div className="min-h-full bg-slate-100 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Алгоритм Кэннона — блочный режим
          </h1>
          <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Пошаговая симуляция параллельного умножения матриц на решётке q×q логических
            процессоров. Матрица нарезается на блоки b×b; каждый процессор P(I,J) держит блок A и
            блок B и накапливает блок C(I,J). Число шагов алгоритма — q, а не N.
          </p>
        </header>

        {matrixCompact && (
          <div className="rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            ⚠ N &gt; {FULL_ANIM_MAX}: компактный режим — ячейки уменьшены, детализация снижена.
            Разворачивайте процессоры по одному, чтобы рассмотреть умножение блоков.
          </div>
        )}

        <ProcessorSelect n={n} q={safeQ} onQChange={handleQChange} />

        <Controls
          n={n}
          onNChange={handleNChange}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          isPlaying={isPlaying}
          atStart={atStart}
          atEnd={atEnd}
          onPrev={goPrev}
          onNext={goNext}
          onPlayToggle={togglePlay}
          onReset={reset}
          speedMs={speedMs}
          onSpeedChange={setSpeedMs}
          rangeMin={rangeMin}
          rangeMax={rangeMax}
          onRangeChange={(lo, hi) => {
            setRangeMin(lo)
            setRangeMax(hi)
          }}
          onRandom={handleRandom}
          theme={theme}
          onThemeToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        />

        <StepCaption snapshot={current} totalSteps={totalSteps} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Processors */}
          <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
                Сетка процессоров {safeQ}×{safeQ}
              </h2>
              <span className="text-xs text-slate-400">
                держат блоки a × b · накапливают блок C(I,J) · ▸ развернуть
              </span>
            </div>
            <div className="overflow-x-auto scroll-thin">
              <ProcessorGrid
                snapshot={current}
                expandedKey={expandedKey}
                onToggleExpand={toggleExpand}
              />
            </div>
          </section>

          {/* Source matrices + result */}
          <aside className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
                  Матрицы A и B (блоки {b}×{b})
                </h2>
                {editable && <span className="text-[11px] text-slate-400">можно править ✎</span>}
              </div>
              <MatrixView
                title="A"
                subtitle={current.kind === 'initial' ? undefined : 'текущая раскладка блоков'}
                blocks={editable ? initial.matrixA : current.matrixA}
                b={b}
                variant="a"
                active={current.multiplying}
                compact={matrixCompact}
                editable={editable}
                onEdit={(row, col, v) => editMatrix('A', row, col, v)}
              />
              <MatrixView
                title="B"
                blocks={editable ? initial.matrixB : current.matrixB}
                b={b}
                variant="b"
                active={current.multiplying}
                compact={matrixCompact}
                editable={editable}
                onEdit={(row, col, v) => editMatrix('B', row, col, v)}
              />
            </div>

            <ResultPanel
              currentC={currentCFull}
              naiveC={naiveC}
              b={b}
              isCorrect={isCorrect}
              isFinalStep={atEnd}
              compact={matrixCompact}
            />
          </aside>
        </div>

        <footer className="pb-4 text-center text-xs text-slate-400 dark:text-slate-600">
          Стрелки ← → — шаги · Пробел — авто/пауза · симуляция, всё считается локально, без сети
        </footer>
      </div>
    </div>
  )
}
