import type { Matrix } from '../lib/cannon'

interface ResultPanelProps {
  /** C as accumulated in the current snapshot (null = no product yet). */
  currentC: (number | null)[][]
  naiveC: Matrix
  isCorrect: boolean
  isFinalStep: boolean
  compact: boolean
}

function CGrid({
  cells,
  n,
  compact,
  highlightDone,
}: {
  cells: (number | null)[][]
  n: number
  compact: boolean
  highlightDone: boolean
}) {
  const size = compact ? 'h-7 w-7 text-xs' : 'h-10 w-10 text-sm'
  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      {cells.flatMap((row, i) =>
        row.map((v, j) => (
          <div
            key={`${i}-${j}`}
            className={`flex items-center justify-center rounded-md border font-mono tabular-nums ${size} ${
              v === null
                ? 'border-slate-200 bg-slate-50 text-slate-300 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-600'
                : highlightDone
                  ? 'border-emerald-400/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'border-slate-300 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
            }`}
          >
            {v === null ? '·' : v}
          </div>
        )),
      )}
    </div>
  )
}

export function ResultPanel({
  currentC,
  naiveC,
  isCorrect,
  isFinalStep,
  compact,
}: ResultPanelProps) {
  const n = naiveC.length

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
          Матрица результата C
        </h3>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isCorrect
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
          }`}
          role="status"
        >
          {isCorrect ? '✓ результат верный' : '✕ ошибка проверки'}
        </span>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Кэннон {isFinalStep ? '(готово)' : '(формируется)'}
          </span>
          <CGrid cells={currentC} n={n} compact={compact} highlightDone={isFinalStep} />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Наивная проверка (A·B)
          </span>
          <CGrid
            cells={naiveC}
            n={n}
            compact={compact}
            highlightDone={false}
          />
        </div>
      </div>

      <p className="text-[11px] leading-tight text-slate-400 dark:text-slate-500">
        Самопроверка: результат Кэннона на последнем шаге сравнивается поэлементно с
        наивным тройным циклом. Финального слияния между процессорами нет — каждый
        P(i,j) уже хранит готовый C(i,j).
      </p>
    </div>
  )
}
