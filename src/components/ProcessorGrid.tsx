import type { Snapshot } from '../lib/cannon'
import { ProcessorCell } from './ProcessorCell'

interface ProcessorGridProps {
  snapshot: Snapshot
  expandedKey: string | null
  onToggleExpand: (key: string) => void
}

export function ProcessorGrid({ snapshot, expandedKey, onToggleExpand }: ProcessorGridProps) {
  const { q, b } = snapshot
  const compact = q > 8
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${q}, minmax(0, 1fr))` }}
      role="grid"
      aria-label={`Сетка процессоров ${q}×${q}`}
    >
      {snapshot.processors.flatMap((row) =>
        row.map((p) => {
          const key = `${p.i}-${p.j}`
          return (
            <ProcessorCell
              key={key}
              p={p}
              b={b}
              multiplying={snapshot.multiplying}
              compact={compact}
              done={snapshot.complete && p.terms.length === q}
              expanded={expandedKey === key}
              onToggleExpand={() => onToggleExpand(key)}
            />
          )
        }),
      )}
    </div>
  )
}
