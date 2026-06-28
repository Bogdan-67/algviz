import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { SyncPage } from './pages/SyncPage'

// Render-only smoke: SyncPage mounts with scenario picker, thread lanes and
// the shared-variable widget (default race scenario).
describe('SyncPage render smoke', () => {
  it('renders without throwing', () => {
    const html = renderToString(createElement(SyncPage))
    expect(html).toContain('Синхронизация потоков')
    expect(html).toContain('Гонка')
    expect(html).toContain('Deadlock')
    expect(html).toContain('Общая переменная x')
    expect(html).toContain('шаг этого потока')
  })
})
