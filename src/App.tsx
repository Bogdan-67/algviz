import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buildCannonSnapshots,
  naiveMultiply,
  matricesEqual,
  randomMatrix,
  cloneMatrix,
  type Matrix,
} from './lib/cannon'
import { MIN_N, MAX_N, FULL_ANIM_MAX } from './lib/constants'
import { Controls } from './components/Controls'
import { MatrixView } from './components/MatrixView'
import { ProcessorGrid } from './components/ProcessorGrid'
import { StepCaption } from './components/StepCaption'
import { ResultPanel } from './components/ResultPanel'

const clampN = (n: number) => Math.max(MIN_N, Math.min(MAX_N, Math.round(n)))

export default function App() {
  const [n, setN] = useState(3)
  const [A, setA] = useState<Matrix>(() => randomMatrix(3, 0, 9))
  const [B, setB] = useState<Matrix>(() => randomMatrix(3, 0, 9))
  const [stepIndex, setStepIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedMs, setSpeedMs] = useState(900)
  const [rangeMin, setRangeMin] = useState(0)
  const [rangeMax, setRangeMax] = useState(9)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const snapshots = useMemo(() => buildCannonSnapshots(A, B), [A, B])
  const naiveC = useMemo(() => naiveMultiply(A, B), [A, B])
  const totalSteps = snapshots.length

  const finalCannonC = useMemo<Matrix>(
    () => snapshots[snapshots.length - 1].processors.map((row) => row.map((p) => p.c)),
    [snapshots],
  )
  const isCorrect = useMemo(
    () => matricesEqual(finalCannonC, naiveC),
    [finalCannonC, naiveC],
  )

  const compact = n > FULL_ANIM_MAX
  const showFormula = n <= FULL_ANIM_MAX
  const current = snapshots[Math.min(stepIndex, totalSteps - 1)]
  const atStart = stepIndex <= 0
  const atEnd = stepIndex >= totalSteps - 1

  // --- theme ---
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [theme])

  // --- regenerate data on size / random ---
  const regenerate = useCallback(
    (size: number) => {
      const lo = Math.min(rangeMin, rangeMax)
      const hi = Math.max(rangeMin, rangeMax)
      setA(randomMatrix(size, lo, hi))
      setB(randomMatrix(size, lo, hi))
      setStepIndex(0)
      setIsPlaying(false)
    },
    [rangeMin, rangeMax],
  )

  const handleNChange = useCallback(
    (value: number) => {
      const next = clampN(value)
      setN(next)
      regenerate(next)
    },
    [regenerate],
  )

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
      if (!p && atEnd) setStepIndex(0) // replay from start
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
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
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
  const editA = useCallback((i: number, j: number, value: number) => {
    setA((prev) => {
      const next = cloneMatrix(prev)
      next[i][j] = value
      return next
    })
    setStepIndex(0)
    setIsPlaying(false)
  }, [])
  const editB = useCallback((i: number, j: number, value: number) => {
    setB((prev) => {
      const next = cloneMatrix(prev)
      next[i][j] = value
      return next
    })
    setStepIndex(0)
    setIsPlaying(false)
  }, [])

  const editable = stepIndex === 0
  const initial = snapshots[0]

  return (
    <div className="min-h-full bg-slate-100 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Алгоритм Кэннона
          </h1>
          <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Пошаговая визуализация параллельного умножения матриц на решётке N×N
            процессоров. Каждый процессор P(i,j) накапливает один элемент C(i,j);
            операнды циклически сдвигаются по тору.
          </p>
        </header>

        {compact && (
          <div className="rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            ⚠ N &gt; {FULL_ANIM_MAX}: включён компактный режим — ячейки без формул,
            только числа. Наглядность снижена.
          </div>
        )}

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

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Processors */}
          <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
                Сетка процессоров P(i,j)
              </h2>
              <span className="text-xs text-slate-400">
                держат a × b · накапливают C(i,j)
              </span>
            </div>
            <div className="overflow-x-auto scroll-thin">
              <ProcessorGrid
                snapshot={current}
                n={n}
                showFormula={showFormula}
                compact={compact}
              />
            </div>
          </section>

          {/* Source matrices + result */}
          <aside className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
                  Матрицы A и B
                </h2>
                {editable && (
                  <span className="text-[11px] text-slate-400">можно править ✎</span>
                )}
              </div>
              <MatrixView
                title="A"
                subtitle={current.kind === 'initial' ? undefined : 'текущая раскладка'}
                cells={editable ? initial.matrixA : current.matrixA}
                variant="a"
                active={current.multiplying}
                compact={compact}
                editable={editable}
                onEdit={editA}
              />
              <MatrixView
                title="B"
                cells={editable ? initial.matrixB : current.matrixB}
                variant="b"
                active={current.multiplying}
                compact={compact}
                editable={editable}
                onEdit={editB}
              />
            </div>

            <ResultPanel
              currentC={current.matrixC}
              naiveC={naiveC}
              isCorrect={isCorrect}
              isFinalStep={atEnd}
              compact={compact}
            />
          </aside>
        </div>

        <footer className="pb-4 text-center text-xs text-slate-400 dark:text-slate-600">
          Стрелки ← → — шаги · Пробел — авто/пауза · всё считается локально, без сети
        </footer>
      </div>
    </div>
  )
}
