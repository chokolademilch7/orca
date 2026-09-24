import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MobileMarkdown } from './MobileMarkdown'

// Why Android here: the sibling selectable test runs as iOS and proves prose IS selectable there;
// this one proves the same document carries no selectable span on Android, where a selectable
// TextView selects words while the transcript scrolls.
vi.mock('react-native', () => ({
  Linking: { openURL: () => Promise.resolve() },
  Platform: { OS: 'android' },
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  Text: 'Text',
  View: 'View'
}))

vi.mock('./pr-sidebar/MermaidDiagram', () => ({ MermaidDiagram: 'MermaidDiagram' }))

const CONTENT = [
  '# Heading',
  'A paragraph with **bold**, `code` and https://example.com/link.',
  '> quoted',
  '- item one',
  '| a | b |',
  '| - | - |',
  '| 1 | 2 |',
  '```',
  'fenced()',
  '```'
].join('\n')

describe('MobileMarkdown on Android', () => {
  let renderer: ReactTestRenderer | null = null

  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  function texts(): ReactTestInstance[] {
    return renderer!.root.findAll((node) => node.type === ('Text' as never))
  }

  it('renders no selectable span, and leaves untouched spans without a selectable prop', () => {
    act(() => {
      renderer = create(createElement(MobileMarkdown, { content: CONTENT, rangeSelectable: true }))
    })
    const all = texts()
    expect(all.length).toBeGreaterThan(5)
    expect(all.filter((node) => node.props.selectable === true)).toHaveLength(0)
    // Inline spans (bold, code, links) never asked for selection; writing `false` onto them
    // would map to `userSelect: none` on the web, so the gate must leave them alone.
    const inline = all.filter((node) => typeof node.props.onPress === 'function')
    expect(inline.length).toBeGreaterThan(0)
    for (const node of inline) {
      expect(node.props.selectable).toBeUndefined()
    }
  })
})
