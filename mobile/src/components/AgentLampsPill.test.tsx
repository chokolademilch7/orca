import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  Pressable: 'Pressable',
  Text: 'Text',
  View: 'View',
  StyleSheet: { create: (styles: Record<string, unknown>) => styles }
}))

const { AgentLampsPill } = await import('./AgentLampsPill')

function render(element: ReturnType<typeof createElement>): ReactTestRenderer {
  let renderer!: ReactTestRenderer
  act(() => {
    renderer = create(element)
  })
  return renderer
}

describe('AgentLampsPill', () => {
  it('shows one coloured entry per non-zero state, attention first', () => {
    const renderer = render(
      createElement(AgentLampsPill, { lamps: ['working', 'done', 'attention', 'working'] })
    )
    const dots = renderer.root
      .findAllByType('View')
      .flatMap((node) => {
        const style = node.props.style
        return Array.isArray(style) ? style : [style]
      })
      .filter((style) => style && typeof style === 'object' && 'backgroundColor' in style)
      .map((style) => style.backgroundColor)

    expect(dots).toEqual(['#ef4444', '#eab308', '#10b981'])
    expect(renderer.root.findAllByType('Text').map((t) => t.props.children)).toEqual([1, 2, 1])
    renderer.unmount()
  })

  it('announces the rollup for a screen reader', () => {
    const renderer = render(createElement(AgentLampsPill, { lamps: ['attention', 'done', 'done'] }))
    expect(renderer.root.findByType('Pressable').props.accessibilityLabel).toBe(
      'Agents: 1 waiting, 2 done'
    )
    renderer.unmount()
  })

  it('renders nothing when no agent carries a live signal', () => {
    const renderer = render(createElement(AgentLampsPill, { lamps: [] }))
    expect(renderer.toJSON()).toBeNull()
    renderer.unmount()
  })
})
