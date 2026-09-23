import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({ Platform: { OS: 'android' } }))

const native = vi.hoisted(() => ({ update: vi.fn(), clear: vi.fn() }))
vi.mock('../../modules/orca-live-update/src', () => ({ OrcaLiveUpdate: native }))

const { clearAgentLamps, postAgentLamps, resetAgentLampsPostStateForTests } =
  await import('./use-agent-lamps-live-update')

beforeEach(() => {
  native.update.mockClear()
  native.clear.mockClear()
  resetAgentLampsPostStateForTests()
})

describe('postAgentLamps', () => {
  it('posts the lamps with their summary and chip text', () => {
    postAgentLamps(['attention', 'working', 'done'])
    expect(native.update).toHaveBeenCalledWith(
      ['attention', 'working', 'done'],
      'Orca agents',
      '1 working · 1 waiting · 1 done',
      '1! 1● 1✓'
    )
  })

  it('skips a repeat of what is already on screen', () => {
    postAgentLamps(['working', 'done'])
    postAgentLamps(['working', 'done'])
    expect(native.update).toHaveBeenCalledTimes(1)
  })

  it('re-posts after another writer changed the notification', () => {
    postAgentLamps(['working'])
    // The background push task writing a different set is what the foreground must notice.
    postAgentLamps(['attention'])
    postAgentLamps(['working'])
    expect(native.update).toHaveBeenCalledTimes(3)
  })

  it('clears on an empty set, and a clear lets the same set post again', () => {
    postAgentLamps(['done'])
    clearAgentLamps()
    expect(native.clear).toHaveBeenCalledTimes(1)
    postAgentLamps(['done'])
    expect(native.update).toHaveBeenCalledTimes(2)
  })
})
