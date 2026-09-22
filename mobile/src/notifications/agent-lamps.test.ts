import { describe, expect, it } from 'vitest'
import type { RuntimeWorktreeAgentRow } from '../../../src/shared/runtime-types'
import { AGENT_STATUS_STALE_AFTER_MS } from '../worktree/agent-row-display'
import { AGENT_LAMP_MAX, agentLampChipText, agentLampSummary, agentLamps } from './agent-lamps'

function row(overrides: Partial<RuntimeWorktreeAgentRow> = {}): RuntimeWorktreeAgentRow {
  return {
    paneKey: 'p',
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
    updatedAt: 1_000,
    ...overrides
  }
}

describe('agentLamps', () => {
  it('maps done, working and waiting agents to lamp states, newest first', () => {
    const lamps = agentLamps(
      [
        { agents: [row({ state: 'done', updatedAt: 3 }), row({ state: 'working', updatedAt: 1 })] },
        { agents: [row({ state: 'waiting', updatedAt: 2 })] }
      ],
      1_000
    )
    expect(lamps).toEqual(['done', 'attention', 'working'])
  })

  it('drops idle, interrupted and stale rows and caps at five', () => {
    const now = 10_000_000
    const live = Array.from({ length: 7 }, (_, i) => row({ updatedAt: now - i }))
    const lamps = agentLamps(
      [
        {
          agents: [
            ...live,
            row({ interrupted: true, updatedAt: now }),
            row({ state: 'working', updatedAt: now - AGENT_STATUS_STALE_AFTER_MS - 1 })
          ]
        },
        {}
      ],
      now
    )
    expect(lamps).toHaveLength(AGENT_LAMP_MAX)
    expect(lamps.every((lamp) => lamp === 'working')).toBe(true)
  })

  it('summarises counts', () => {
    expect(agentLampSummary(['working', 'done', 'working'])).toBe('2 working · 1 done')
    expect(agentLampSummary(['attention', 'done'])).toBe('0 working · 1 waiting · 1 done')
    expect(agentLamps([], 0)).toEqual([])
  })

  it('renders chip counts, attention first, zero counts dropped', () => {
    expect(agentLampChipText(['working', 'done', 'attention', 'working'])).toBe('1! 2● 1✓')
    expect(agentLampChipText(['done', 'done'])).toBe('2✓')
  })
})
