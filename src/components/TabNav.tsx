export type TabId = 'cannon' | 'join' | 'topology'

interface TabNavProps {
  active: TabId
  onChange: (tab: TabId) => void
  theme: 'dark' | 'light'
  onThemeToggle: () => void
}

const TABS: Array<{ id: TabId; label: string; hint: string }> = [
  { id: 'cannon', label: 'Кэннон', hint: 'умножение матриц' },
  { id: 'join', label: 'Параллельный JOIN', hint: 'соединение шардов' },
  { id: 'topology', label: 'Топологии', hint: 'сети межсоединений' },
]

export function TabNav({ active, onChange, theme, onThemeToggle }: TabNavProps) {
  return (
    <nav
      className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85"
      aria-label="Разделы визуализатора"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 sm:px-6 lg:px-8">
        <span className="mr-2 hidden text-sm font-bold tracking-tight text-slate-700 dark:text-slate-200 sm:block">
          AlgViz
        </span>
        <div role="tablist" className="flex gap-1">
          {TABS.map((t) => {
            const isActive = active === t.id
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => onChange(t.id)}
                className={`flex flex-col items-start rounded-lg px-3 py-1.5 text-left transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-sky-500'
                    : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-sm font-semibold leading-none">{t.label}</span>
                <span
                  className={`text-[10px] leading-tight ${
                    isActive ? 'text-slate-200 dark:text-sky-50' : 'text-slate-400'
                  }`}
                >
                  {t.hint}
                </span>
              </button>
            )
          })}
        </div>
        <button
          onClick={onThemeToggle}
          aria-label="Переключить тему"
          className="ml-auto rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          {theme === 'dark' ? '☀ Светлая' : '🌙 Тёмная'}
        </button>
      </div>
    </nav>
  )
}
