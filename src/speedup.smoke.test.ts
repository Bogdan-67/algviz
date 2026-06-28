import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { SpeedupPage } from './pages/SpeedupPage'

// Render-only smoke: SpeedupPage mounts with charts, numbers and compare note.
describe('SpeedupPage render smoke', () => {
  it('renders without throwing', () => {
    const html = renderToString(createElement(SpeedupPage))
    expect(html).toContain('Амдал')
    expect(html).toContain('Густафсон')
    expect(html).toContain('Ускорение S(p)')
    expect(html).toContain('Эффективность')
    expect(html).toContain('Разбиение времени')
  })
})
