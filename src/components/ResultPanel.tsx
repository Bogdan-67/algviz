import type { Matrix } from '../lib/cannon'

interface ResultPanelProps {
  /** Current Cannon C assembled to N×N; null where the block isn't computed yet. */
  currentC: (number | null)[][]
  naiveC: Matrix
  /** Block size, for drawing block separators. */
  b: number
  isCorrect: boolean
  isFinalStep: boolean
  compact: boolean
}

function CGrid({
  cells,
  b,
  compact,
  highlightDone,
}: {
  cells: (number | null)[][]
  b: number
  compact: boolean
  highlightDone: boolean
}) {
  const n = cells.length
  const size = compact ? 'h-6 w-6 text-[10px]' : 'h-9 w-9 text-sm'
  return (
    <div
      className="grid gap-px rounded bg-slate-300/50 p-px dark:bg-slate-600/50"
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      {cells.flatMap((row, i) =>
        row.map((v, j) => {
          // Thicker separators on block boundaries.
          const blockEdge = [
            i % b === 0 ? 'border-t-2' : '',
            j % b === 0 ? 'border-l-2' : '',
            (i + 1) % b === 0 ? 'border-b-2' : '',
            (j + 1) % b === 0 ? 'border-r-2' : '',
          ].join(' ')
          return (
            <div
              key={`${i}-${j}`}
              className={`flex items-center justify-center border-slate-400/70 font-mono tabular-nums dark:border-slate-500/70 ${blockEdge} ${size} ${
                v === null
                  ? 'bg-slate-50 text-slate-300 dark:bg-slate-800/40 dark:text-slate-600'
                  : highlightDone
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100'
              }`}
            >
              {v === null ? '·' : v}
            </div>
          )
        }),
      )}
    </div>
  )
}

export function ResultPanel({
  currentC,
  naiveC,
  b,
  isCorrect,
  isFinalStep,
  compact,
}: ResultPanelProps) {
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
          <CGrid cells={currentC} b={b} compact={compact} highlightDone={isFinalStep} />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Наивная проверка (A·B)
          </span>
          <CGrid cells={naiveC} b={b} compact={compact} highlightDone={false} />
        </div>
      </div>

      <p className="text-[11px] leading-tight text-slate-400 dark:text-slate-500">
        Самопроверка: результат Кэннона на последнем шаге сравнивается поэлементно с наивным
        тройным циклом. C собрана из блоков-накопителей процессоров — финального слияния между
        процессорами нет.
      </p>
    </div>
  )
}
