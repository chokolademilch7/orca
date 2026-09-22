import type { RuntimeWorktreeAgentRow } from '../../../src/shared/runtime-types'
import { agentDotState } from '../worktree/agent-row-display'

export const AGENT_LAMP_MAX = 5

/** working: yellow · attention (blocked/waiting): red · done: green — same palette as AgentStateDot. */
export type AgentLamp = 'working' | 'attention' | 'done'
const AGENT_LAMPS: readonly string[] = ['working', 'attention', 'done']
export const isAgentLamp = (value: string): value is AgentLamp => AGENT_LAMPS.includes(value)

/** One lamp per agent, most recently updated first, capped at AGENT_LAMP_MAX.
 *  Idle and interrupted rows carry no live signal, so they take no lamp. */
export function agentLamps(
  worktrees: readonly { agents?: readonly RuntimeWorktreeAgentRow[] }[],
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

/** Status-bar chip text. The chip is monochrome, so counts per glyph replace one glyph per lamp;
 *  attention leads because it is the one state that needs the user. Zero counts are dropped. */
export function agentLampChipText(lamps: readonly AgentLamp[]): string {
  const glyph: Record<AgentLamp, string> = { attention: '!', working: '●', done: '✓' }
  return (['attention', 'working', 'done'] as const)
    .map((lamp) => ({ n: countLamp(lamps, lamp), glyph: glyph[lamp] }))
    .filter(({ n }) => n > 0)
    .map(({ n, glyph }) => `${n}${glyph}`)
    .join(' ')
}
