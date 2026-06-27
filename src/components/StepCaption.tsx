import { AnimatePresence, motion } from 'framer-motion'
import type { Snapshot } from '../lib/cannon'

interface StepCaptionProps {
  snapshot: Snapshot
  totalSteps: number
}

const kindLabel: Record<Snapshot['kind'], string> = {
  initial: 'Раскладка',
  skew: 'Выравнивание',
  multiply: 'Умножение',
}

export function StepCaption({ snapshot, totalSteps }: StepCaptionProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-white dark:bg-slate-200 dark:text-slate-900">
          Шаг {snapshot.index} из {totalSteps - 1}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {kindLabel[snapshot.kind]}
        </span>
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={snapshot.index}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="text-sm leading-snug text-slate-600 dark:text-slate-300"
        >
          {snapshot.caption}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}
