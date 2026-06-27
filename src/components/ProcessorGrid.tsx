import type { Snapshot } from '../lib/cannon'
import { ProcessorCell } from './ProcessorCell'

interface ProcessorGridProps {
  snapshot: Snapshot
  n: number
  showFormula: boolean
  compact: boolean
}

export function ProcessorGrid({ snapshot, n, showFormula, compact }: ProcessorGridProps) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      role="grid"
      aria-label="Сетка процессоров"
    >
      {snapshot.processors.flatMap((row) =>
        row.map((p) => {
          const done = snapshot.complete && p.terms.length === n
          return (
            <ProcessorCell
              key={`${p.i}-${p.j}`}
              p={p}
              multiplying={snapshot.multiplying}
              showFormula={showFormula}
              compact={compact}
              done={done}
            />
          )
        }),
      )}
    </div>
  )
}
