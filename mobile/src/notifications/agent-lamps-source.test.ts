import { createElement } from 'react'
import { act, create } from 'react-test-renderer'
import { afterEach, describe, expect, it } from 'vitest'
import type { Worktree } from '../worktree/workspace-list-types'
import {
  publishAgentLampsWorktrees,
  resetAgentLampsSourceForTests,
  useAgentLampsWorktrees
} from './agent-lamps-source'

const rows = [{ worktreeId: 'w1' } as Worktree]

describe('agent lamps source', () => {
  afterEach(resetAgentLampsSourceForTests)

  it('hands a host its latest published rows and nothing for another host', () => {
    const seen: (readonly Worktree[])[] = []
    function Probe({ hostId }: { hostId: string }) {
      seen.push(useAgentLampsWorktrees(hostId))
      return null
    }
    let renderer!: ReturnType<typeof create>
    act(() => {
      renderer = create(createElement(Probe, { hostId: 'h1' }))
    })
    act(() => publishAgentLampsWorktrees('h1', rows))
    act(() => publishAgentLampsWorktrees('h2', [{ worktreeId: 'w2' } as Worktree]))
    expect(seen.at(-1)).toBe(rows)
    act(() => renderer.update(createElement(Probe, { hostId: 'h2' })))
    expect(seen.at(-1)).toEqual([{ worktreeId: 'w2' }])
    renderer.unmount()
  })
})
