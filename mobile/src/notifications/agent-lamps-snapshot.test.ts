import { describe, expect, it, vi } from 'vitest'

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(), setItem: vi.fn() }
}))
vi.mock('../transport/host-store', () => ({ loadHostCatalog: vi.fn(async () => []) }))
vi.mock('./use-agent-lamps-live-update', () => ({ postAgentLamps: vi.fn() }))

const { overlayPushOnSnapshot, snapshotRows } = await import('./agent-lamps-snapshot')
const { agentLamps } = await import('./agent-lamps')

const rows = snapshotRows([
  {
    worktreeId: 'wt1',
    agents: [
      {
        paneKey: 't1:l1',
        parentPaneKey: null,
        state: 'working',
        agentType: 'claude',
        prompt: '',
        taskTitle: null,
        displayName: null,
        lastAssistantMessage: null,
        toolName: null,
        toolInput: null,
        interrupted: false,
        stateStartedAt: 0,
        updatedAt: 1_000
      },
      {
        paneKey: 't1:l2',
        parentPaneKey: null,
        state: 'working',
        agentType: 'claude',
        prompt: '',
        taskTitle: null,
        displayName: null,
        lastAssistantMessage: null,
        toolName: null,
        toolInput: null,
        interrupted: false,
        stateStartedAt: 0,
        updatedAt: 900
      }
    ]
  }
])

describe('overlayPushOnSnapshot', () => {
  it('writes the pushed state onto the named pane only', () => {
    const next = overlayPushOnSnapshot(
      rows,
      { paneKey: 't1:l1', worktreeId: 'wt1', agentState: 'needs-input' },
      2_000
    )
    expect(agentLamps([{ agents: next }], 2_000)).toEqual(['attention', 'working'])
  })

  it('falls back to every pane of the worktree when the host named no pane', () => {
    const next = overlayPushOnSnapshot(rows, { worktreeId: 'wt1', agentState: 'finished' }, 2_000)
    expect(agentLamps([{ agents: next }], 2_000)).toEqual(['done', 'done'])
  })

  it('leaves the rows alone for a push without a state', () => {
    expect(overlayPushOnSnapshot(rows, { worktreeId: 'wt1' }, 2_000)).toEqual(rows)
  })
})
