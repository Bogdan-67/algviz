import type { Scenario } from '../../lib/sync'

interface ScenarioPickerProps {
  scenario: Scenario
  onPick: (s: Scenario) => void
}

const SCENARIOS: Array<{ id: Scenario; label: string }> = [
  { id: 'race', label: 'Гонка' },
  { id: 'mutex', label: 'Mutex / lock' },
  { id: 'semaphore', label: 'Семафор (двоичный)' },
  { id: 'prodcons', label: 'Производитель–потребитель' },
  { id: 'barrier', label: 'Барьер' },
  { id: 'deadlock', label: 'Deadlock' },
]

export function ScenarioPicker({ scenario, onPick }: ScenarioPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Сценарии синхронизации">
      {SCENARIOS.map((s) => {
        const isActive = scenario === s.id
        return (
          <button
            key={s.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onPick(s.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'border-sky-500 bg-sky-500 text-white'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {s.label}
          </button>
        )
      })}
    </div>
  )
}
