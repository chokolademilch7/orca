import type { RuntimeWorktreeAgentRow } from '../../../src/shared/runtime-types'
import { agentDotState } from '../worktree/agent-row-display'

export const AGENT_LAMP_MAX = 5

/** One lamp per agent, most recently updated first, capped at AGENT_LAMP_MAX. Lit while the
 *  agent still needs the desktop (working, monitoring, blocked, waiting), dark once done.
 *  Idle and interrupted rows carry no live signal, so they take no lamp. */
export function agentLamps(
  worktrees: readonly { agents?: readonly RuntimeWorktreeAgentRow[] }[],
  now: number
): boolean[] {
  return worktrees
    .flatMap((worktree) => worktree.agents ?? [])
    .map((row) => ({ row, dot: agentDotState(row, now) }))
    .filter(({ dot }) => dot !== 'idle' && dot !== 'interrupted')
    .sort((a, b) => b.row.updatedAt - a.row.updatedAt)
    .slice(0, AGENT_LAMP_MAX)
    .map(({ dot }) => dot !== 'done')
}

export function agentLampSummary(lamps: readonly boolean[]): string {
  const lit = lamps.filter(Boolean).length
  return `${lit} working · ${lamps.length - lit} done`
}
