import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'

// A render-time smoke test: mounting <App/> must not throw and the initial
// render must contain the self-check verdict, the processor-count control and
// the simulation clarification. Catches render bugs the type-checker cannot.
// renderToString needs no DOM and skips effects (document access lives there).
describe('App render smoke', () => {
  it('renders the initial step without throwing', () => {
    const html = renderToString(createElement(App))
    expect(html).toContain('Алгоритм Кэннона') // header
    expect(html).toContain('результат верный') // self-check passes on first mount
    expect(html).toContain('Сетка процессоров') // processor grid rendered
    expect(html).toContain('Число процессоров') // block-mode selector
    expect(html).toContain('симуляция') // conceptual clarification
  })
})
