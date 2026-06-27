import { motion } from 'framer-motion'
import type { BlockCell } from '../lib/cannon'

type Variant = 'a' | 'b'

interface MatrixViewProps {
  title: string
  subtitle?: string
  /** q×q grid of held blocks. */
  blocks: BlockCell[][]
  /** Block size b (cells per side of each block). */
  b: number
  variant: Variant
  /** Active multiply step → accent + shift arrow. */
  active: boolean
  compact: boolean
  editable?: boolean
  /** Edit by ABSOLUTE element coordinates. */
  onEdit?: (row: number, col: number, value: number) => void
}

const variantAccent: Record<Variant, string> = {
  a: 'text-sky-600 dark:text-sky-300',
  b: 'text-violet-600 dark:text-violet-300',
}

/** Distinct, subtle background tint per origin block so blocks are trackable as they move. */
function blockTint(originRow: number, originCol: number, q: number): string {
  if (q <= 1) return 'transparent'
  const idx = originRow * q + originCol
  const hue = Math.round((idx * 360) / (q * q))
  return `hsl(${hue} 70% 55% / 0.14)`
}

export function MatrixView({
  title,
  subtitle,
  blocks,
  b,
  variant,
  active,
  compact,
  editable = false,
  onEdit,
}: MatrixViewProps) {
  const q = blocks.length
  const tinted = q > 1 // only tint in block mode (b > 1); keep element mode clean
  const cell = compact ? 18 : 26
  const fontSize = b >= 4 ? 9 : b === 3 ? 11 : compact ? 11 : 13
  const arrow = variant === 'a' ? '←' : '↑'

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
          {title}
        </h3>
        {active && (
          <span className={`text-xs font-bold ${variantAccent[variant]}`} aria-hidden>
            блоки {arrow}
          </span>
        )}
      </div>
      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${q}, max-content)`,
          gridTemplateRows: `repeat(${q}, max-content)`,
        }}
      >
        {blocks.flatMap((row, I) =>
          row.map((bc, J) => (
            <motion.div
              key={`${bc.originRow}-${bc.originCol}`}
              layout
              transition={{ type: 'spring', stiffness: 480, damping: 40 }}
              style={{
                gridColumn: J + 1,
                gridRow: I + 1,
                background: tinted ? blockTint(bc.originRow, bc.originCol, q) : undefined,
              }}
              className={`inline-grid rounded-md border p-0.5 ${
                active
                  ? 'border-slate-400/70 dark:border-slate-400/50'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${b}, ${cell}px)`,
                  gridTemplateRows: `repeat(${b}, ${cell}px)`,
                }}
              >
                {bc.block.flatMap((brow, r) =>
                  brow.map((v, c) => {
                    const absRow = bc.originRow * b + r
                    const absCol = bc.originCol * b + c
                    return (
                      <div
                        key={`${r}-${c}`}
                        className={`flex items-center justify-center font-mono tabular-nums ${variantAccent[variant]}`}
                        style={{ fontSize }}
                      >
                        {editable && onEdit ? (
                          <input
                            aria-label={`${title} строка ${absRow + 1} столбец ${absCol + 1}`}
                            value={v}
                            onChange={(e) => {
                              const parsed = parseInt(e.target.value, 10)
                              onEdit(absRow, absCol, Number.isNaN(parsed) ? 0 : parsed)
                            }}
                            inputMode="numeric"
                            className="h-full w-full rounded bg-transparent text-center outline-none focus:ring-2 focus:ring-inset focus:ring-sky-400/60"
                          />
                        ) : (
                          v
                        )}
                      </div>
                    )
                  }),
                )}
              </div>
            </motion.div>
          )),
        )}
      </div>
      {subtitle && (
        <p className="text-[11px] leading-tight text-slate-400 dark:text-slate-500">{subtitle}</p>
      )}
    </div>
  )
}
