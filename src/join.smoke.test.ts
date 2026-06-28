import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { JoinPage } from './pages/JoinPage'

// Mount the JOIN page (render-only): must not throw, must show the self-check
// verdict, the fragmentation schema and parallel lanes on first render.
describe('JoinPage render smoke', () => {
  it('renders without throwing and self-check passes on first render', () => {
    const html = renderToString(createElement(JoinPage))
    expect(html).toContain('Параллельный JOIN')
    expect(html).toContain('результат верный') // matches naiveJoin at final snapshot
    expect(html).toContain('фрагментация') // sharding schema
    expect(html).toContain('Параллельные дорожки') // lanes
    expect(html).toContain('Теор. максимум') // metrics
  })
})
