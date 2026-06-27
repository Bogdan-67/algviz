import { motion } from 'framer-motion'
import type { CellState } from '../lib/cannon'

type Variant = 'a' | 'b'

interface MatrixViewProps {
  title: string
  subtitle?: string
  cells: CellState[][]
  variant: Variant
  /** Show a directional shift arrow + accent (active multiply step). */
  active: boolean
  compact: boolean
  editable?: boolean
  onEdit?: (i: number, j: number, value: number) => void
}

const variantAccent: Record<Variant, string> = {
  a: 'text-sky-600 dark:text-sky-300',
  b: 'text-violet-600 dark:text-violet-300',
}

const variantBorder: Record<Variant, string> = {
  a: 'border-sky-400/70 dark:border-sky-400/60',
  b: 'border-violet-400/70 dark:border-violet-400/60',
}

/**
 * Renders A or B with stable per-element identity so Framer Motion animates
 * the toroidal shifts: each original element keeps its key and slides to its
 * new grid position when the configuration changes.
 */
export function MatrixView({
  title,
  subtitle,
  cells,
  variant,
  active,
  compact,
  editable = false,
  onEdit,
}: MatrixViewProps) {
  const n = cells.length
  const cellSize = compact ? 'h-7 w-7 text-xs' : 'h-10 w-10 text-sm sm:h-11 sm:w-11'
  const arrow = variant === 'a' ? '←' : '↑'

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
          {title}
        </h3>
        {active && (
          <motion.span
            key="arrow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-xs font-bold ${variantAccent[variant]}`}
            aria-hidden
          >
            сдвиг {arrow}
          </motion.span>
        )}
      </div>
      <div
        className="relative grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${n}, minmax(0, 1fr))`,
        }}
      >
        {cells.flatMap((row, i) =>
          row.map((cell, j) => {
            const key = `${cell.originRow}-${cell.originCol}`
            return (
              <motion.div
                key={key}
                layout
                transition={{ type: 'spring', stiffness: 520, damping: 42 }}
                style={{ gridColumn: j + 1, gridRow: i + 1 }}
                className={`flex items-center justify-center rounded-md border font-mono tabular-nums ${cellSize} ${
                  active
                    ? `${variantBorder[variant]} bg-slate-50 dark:bg-slate-800/80`
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/40'
                } ${variantAccent[variant]}`}
              >
                {editable && onEdit ? (
                  <input
                    aria-label={`${title} строка ${i + 1} столбец ${j + 1}`}
                    value={cell.value}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10)
                      onEdit(cell.originRow, cell.originCol, Number.isNaN(v) ? 0 : v)
                    }}
                    inputMode="numeric"
                    className="h-full w-full bg-transparent text-center font-mono outline-none focus:ring-2 focus:ring-inset focus:ring-sky-400/60 rounded-md"
                  />
                ) : (
                  cell.value
                )}
              </motion.div>
            )
          }),
        )}
      </div>
      {subtitle && (
        <p className="text-[11px] leading-tight text-slate-400 dark:text-slate-500">
          {subtitle}
        </p>
      )}
    </div>
  )
}
