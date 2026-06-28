import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buildSnapshots,
  idTrack,
  sortMetrics,
  makeData,
  isPowerOfTwo,
  type SortKind,
  type Preset,
} from '../lib/sort'
import { SortControls } from '../components/sort/SortControls'
import { ArrayBars } from '../components/sort/ArrayBars'
import { NetworkStrip } from '../components/sort/NetworkStrip'
import { SortMetrics } from '../components/sort/SortMetrics'

const ODDEVEN_SIZES = [4, 6, 8, 10, 12, 16, 20, 24]
const BITONIC_SIZES = [4, 8, 16, 32]
const MAX_MANUAL = 32

export function SortPage() {
  const [kind, setKind] = useState<SortKind>('oddeven')
  const [n, setN] = useState(8)
  const [preset, setPreset] = useState<Preset>('random')
  const [data, setData] = useState<number[]>(() => makeData('random', 8))
  const [stepIndex, setStepIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedMs, setSpeedMs] = useState(650)
  const [showContrast, setShowContrast] = useState(true)

  const sizes = kind === 'bitonic' ? BITONIC_SIZES : ODDEVEN_SIZES
  const snapshots = useMemo(() => buildSnapshots(kind, data), [kind, data])
  const ids = useMemo(() => idTrack(snapshots), [snapshots])
  const metrics = useMemo(() => sortMetrics(snapshots), [snapshots])
  const maxVal = useMemo(() => Math.max(1, ...data), [data])

  const totalSteps = snapshots.length
  const safeStep = Math.min(stepIndex, totalSteps - 1)
  const current = snapshots[safeStep]
  const atStart = stepIndex <= 0
  const atEnd = stepIndex >= totalSteps - 1

  const resetTransport = () => {
    setStepIndex(0)
    setIsPlaying(false)
  }

  const regenerate = useCallback((p: Preset, size: number) => {
    setData(makeData(p, size))
    setStepIndex(0)
    setIsPlaying(false)
  }, [])

  const handleKind = useCallback(
    (k: SortKind) => {
      setKind(k)
      const allowed = k === 'bitonic' ? BITONIC_SIZES : ODDEVEN_SIZES
      if (!allowed.includes(n) || (k === 'bitonic' && !isPowerOfTwo(n))) {
        const nextN = k === 'bitonic' ? 16 : 8
        setN(nextN)
        regenerate(preset, nextN)
      } else {
        setStepIndex(0)
        setIsPlaying(false)
      }
    },
    [n, preset, regenerate],
  )

  const handleSize = useCallback(
    (size: number) => {
      setN(size)
      regenerate(preset, size)
    },
    [preset, regenerate],
  )

  const handlePreset = useCallback(
    (p: Preset) => {
      setPreset(p)
      regenerate(p, n)
    },
    [n, regenerate],
  )

  const handleRandom = useCallback(() => {
    setPreset('random')
    regenerate('random', n)
  }, [n, regenerate])

  const handleManual = useCallback(
    (values: number[]) => {
      let vals = values.slice(0, MAX_MANUAL)
      let nextKind = kind
      if (kind === 'bitonic' && !isPowerOfTwo(vals.length)) {
        nextKind = 'oddeven'
        setKind('oddeven')
      }
      void nextKind
      setN(vals.length)
      setData(vals)
      setStepIndex(0)
      setIsPlaying(false)
    },
    [kind],
  )

  // transport
  const goNext = useCallback(() => setStepIndex((s) => Math.min(s + 1, totalSteps - 1)), [totalSteps])
  const goPrev = useCallback(() => setStepIndex((s) => Math.max(s - 1, 0)), [])
  const togglePlay = useCallback(() => {
    setIsPlaying((p) => {
      if (!p && atEnd) setStepIndex(0)
      return !p
    })
  }, [atEnd])

  useEffect(() => {
    if (!isPlaying) return
    if (atEnd) {
      setIsPlaying(false)
      return
    }
    const id = setTimeout(() => setStepIndex((s) => Math.min(s + 1, totalSteps - 1)), speedMs)
    return () => clearTimeout(id)
  }, [isPlaying, stepIndex, atEnd, speedMs, totalSteps])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
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

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Параллельная сортировка</h1>
        <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          Пошаговая симуляция параллельных сетей сортировки. Основа — compare-exchange: пара
          сравнивается и оставляет меньший/больший. На каждой фазе много непересекающихся пар
          работают одновременно. Реальных потоков нет — это визуализация.
        </p>
      </header>

      <SortControls
        kind={kind}
        onKind={handleKind}
        n={n}
        sizes={sizes}
        onSize={handleSize}
        onPreset={handlePreset}
        onRandom={handleRandom}
        onManual={handleManual}
        stepIndex={safeStep}
        totalSteps={totalSteps}
        isPlaying={isPlaying}
        atStart={atStart}
        atEnd={atEnd}
        onPrev={goPrev}
        onNext={goNext}
        onPlayToggle={togglePlay}
        onReset={resetTransport}
        speedMs={speedMs}
        onSpeedChange={setSpeedMs}
      />

      <div className="rounded-xl border border-slate-200 bg-white/70 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
        <span className="font-semibold">
          Фаза {safeStep} из {totalSteps - 1}:
        </span>{' '}
        {current.caption}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
          <ArrayBars snapshot={current} idsAtPos={ids[safeStep]} maxVal={maxVal} />
          <NetworkStrip snapshots={snapshots} currentIndex={safeStep} onSelect={setStepIndex} />
        </section>

        <aside className="flex flex-col gap-5">
          <SortMetrics
            metrics={metrics}
            current={current}
            showContrast={showContrast}
            onToggleContrast={() => setShowContrast((v) => !v)}
          />
          <div className="rounded-xl border border-slate-200 bg-white/70 p-4 text-[12px] leading-snug text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
            {kind === 'bitonic' ? (
              <>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Битоническая (сеть Бэтчера):
                </span>{' '}
                сеть сравнений фиксирована и не зависит от данных — одни и те же пары и направления
                (<span className="text-sky-500">▲</span>/<span className="text-violet-500">▼</span>)
                для любого входа. Сложность ~O(log²n) фаз.
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Чётно-нечётная:
                </span>{' '}
                параллельный пузырёк на линейке. Чередуются чётные пары (0,1)(2,3)… и нечётные
                (1,2)(3,4)…. Обмен зависит от данных; не более n фаз.
              </>
            )}
          </div>
        </aside>
      </div>

      <footer className="pb-4 text-center text-xs text-slate-400 dark:text-slate-600">
        Стрелки ← → — фазы · Пробел — авто/пауза · симуляция, всё локально
      </footer>
    </div>
  )
}
