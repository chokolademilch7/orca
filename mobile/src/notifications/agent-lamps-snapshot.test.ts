import { beforeEach, describe, expect, it, vi } from 'vitest'

const storage = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn() }))
// Why mocked: the real resolver hashes a public key, so a fixture fingerprint would resolve to
// null and every assertion below would pass without the code under test ever running.
const fingerprint = vi.hoisted(() => ({ resolveHostIdForFingerprint: vi.fn(() => 'h1') }))
vi.mock('./push-host-fingerprint', () => fingerprint)
vi.mock('@react-native-async-storage/async-storage', () => ({ default: storage }))
const hosts = vi.hoisted(() => ({ loadHostCatalog: vi.fn(async () => [] as unknown[]) }))
vi.mock('../transport/host-store', () => hosts)
const posted = vi.hoisted(() => ({ postAgentLamps: vi.fn() }))
vi.mock('./use-agent-lamps-live-update', () => posted)

const { applyPushToAgentLamps, overlayPushOnSnapshot, snapshotRows } =
  await import('./agent-lamps-snapshot')
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

describe('applyPushToAgentLamps', () => {
  const payload = {
    hostFingerprint: 'fp',
    paneKey: 't1:l1',
    worktreeId: 'wt1',
    agentState: 'finished' as const
  }

  beforeEach(() => {
    posted.postAgentLamps.mockClear()
    storage.getItem.mockReset()
    storage.setItem.mockReset()
    hosts.loadHostCatalog.mockResolvedValue([{ id: 'h1', publicKeyB64: 'k' }])
  })

  it('never takes the notification down when the snapshot yields no lamps', async () => {
    // A host whose snapshot was never written: rows are empty, so there is nothing to show —
    // but a push is not evidence that every agent finished, so the live notification must stand.
    storage.getItem.mockResolvedValue(null)
    await applyPushToAgentLamps(payload)
    expect(posted.postAgentLamps).not.toHaveBeenCalled()
  })

  it('leaves the notification alone when the snapshot cannot be read', async () => {
    storage.getItem.mockRejectedValue(new Error('storage unavailable'))
    await applyPushToAgentLamps(payload)
    expect(posted.postAgentLamps).not.toHaveBeenCalled()
  })

  it('does nothing for a push that carries no agent state', async () => {
    await applyPushToAgentLamps({ hostFingerprint: 'fp', worktreeId: 'wt1' })
    expect(storage.getItem).not.toHaveBeenCalled()
    expect(posted.postAgentLamps).not.toHaveBeenCalled()
  })
})
