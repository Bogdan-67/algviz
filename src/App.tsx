import { useEffect, useState } from 'react'
import { TabNav, type TabId } from './components/TabNav'
import { CannonPage } from './pages/CannonPage'
import { JoinPage } from './pages/JoinPage'

export default function App() {
  const [tab, setTab] = useState<TabId>('cannon')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [theme])

  return (
    <div className="min-h-full bg-slate-100 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <TabNav
        active={tab}
        onChange={setTab}
        theme={theme}
        onThemeToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />
      <main>{tab === 'cannon' ? <CannonPage /> : <JoinPage />}</main>
    </div>
  )
}
