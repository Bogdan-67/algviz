import type { Block } from '../lib/cannon'

type Tone = 'a' | 'b' | 'c' | 'plain'

const toneText: Record<Tone, string> = {
  a: 'text-sky-700 dark:text-sky-200',
  b: 'text-violet-700 dark:text-violet-200',
  c: 'text-slate-800 dark:text-slate-100',
  plain: 'text-slate-600 dark:text-slate-300',
}

const toneBg: Record<Tone, string> = {
  a: 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/30',
  b: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30',
  c: 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600',
  plain: 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600',
}

interface MiniMatrixProps {
  block: Block
  tone: Tone
  /** Pixel size of each inner cell. */
  cell?: number
  highlight?: boolean
}

/** Renders a b×b block as a compact bordered grid of numbers. */
export function MiniMatrix({ block, tone, cell = 18, highlight = false }: MiniMatrixProps) {
  const b = block.length
  const fontSize = b >= 4 ? 9 : b === 3 ? 10 : 11
  return (
    <div
      className={`inline-grid rounded border p-0.5 font-mono tabular-nums ${toneBg[tone]} ${
        highlight ? 'ring-2 ring-amber-400/70' : ''
      }`}
      style={{
        gridTemplateColumns: `repeat(${b}, ${cell}px)`,
        gridTemplateRows: `repeat(${b}, ${cell}px)`,
      }}
    >
      {block.flatMap((row, r) =>
        row.map((v, c) => (
          <span
            key={`${r}-${c}`}
            className={`flex items-center justify-center ${toneText[tone]}`}
            style={{ fontSize }}
          >
            {v}
          </span>
        )),
      )}
    </div>
  )
}
