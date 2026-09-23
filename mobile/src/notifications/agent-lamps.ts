import type { RuntimeWorktreeAgentRow } from '../../../src/shared/runtime-types'
import { agentDotState } from '../worktree/agent-row-display'

export const AGENT_LAMP_MAX = 5

/** working: yellow · attention (blocked/waiting): red · done: green — same palette as AgentStateDot. */
export type AgentLamp = 'working' | 'attention' | 'done'
const AGENT_LAMPS: readonly string[] = ['working', 'attention', 'done']
export const isAgentLamp = (value: string): value is AgentLamp => AGENT_LAMPS.includes(value)

/** One lamp per agent, most recently updated first, capped at AGENT_LAMP_MAX.
 *  Idle and interrupted rows carry no live signal, so they take no lamp. */
export type AgentLampRow = Pick<
  RuntimeWorktreeAgentRow,
  'state' | 'workingMode' | 'interrupted' | 'updatedAt'
>

export function agentLamps(
  worktrees: readonly { agents?: readonly AgentLampRow[] }[],
  now: number
): AgentLamp[] {
  return worktrees
    .flatMap((worktree) => worktree.agents ?? [])
    .map((row) => ({ row, dot: agentDotState(row, now) }))
    .filter(({ dot }) => dot !== 'idle' && dot !== 'interrupted')
    .sort((a, b) => b.row.updatedAt - a.row.updatedAt)
    .slice(0, AGENT_LAMP_MAX)
    .map(({ dot }) =>
      dot === 'done' ? 'done' : dot === 'blocked' || dot === 'waiting' ? 'attention' : 'working'
    )
}

const countLamp = (lamps: readonly AgentLamp[], lamp: AgentLamp) =>
  lamps.filter((l) => l === lamp).length

export function agentLampSummary(lamps: readonly AgentLamp[]): string {
  const count = (lamp: AgentLamp) => countLamp(lamps, lamp)
  const parts = [
    `${count('working')} working`,
    count('attention') > 0 ? `${count('attention')} waiting` : null,
    `${count('done')} done`
  ]
  return parts.filter((p) => p !== null).join(' · ')
}

/** Reading order for a per-state rollup: attention leads because it is the one state that needs
 *  the user, done trails because it needs nothing. */
const AGENT_LAMP_ORDER = ['attention', 'working', 'done'] as const

/** Non-zero per-state counts in reading order — the rollup the chip and the in-app pill share. */
export function agentLampCounts(lamps: readonly AgentLamp[]): { lamp: AgentLamp; count: number }[] {
  return AGENT_LAMP_ORDER.map((lamp) => ({ lamp, count: countLamp(lamps, lamp) })).filter(
    ({ count }) => count > 0
  )
}

/** Status-bar chip text. The chip is monochrome, so counts per glyph replace one glyph per lamp. */
export function agentLampChipText(lamps: readonly AgentLamp[]): string {
  const glyph: Record<AgentLamp, string> = { attention: '!', working: '●', done: '✓' }
  return agentLampCounts(lamps)
    .map(({ lamp, count }) => `${count}${glyph[lamp]}`)
    .join(' ')
}
