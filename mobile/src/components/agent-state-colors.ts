import type { AgentDotState } from '../worktree/agent-row-display'

// The one palette for agent state on mobile: the sidebar dot, the in-app lamps pill, and the
// Android Live Update notification's segments (mirrored as hex in OrcaLiveUpdateModule.kt) all
// read from here. Kept free of react-native and icon imports so non-rendering callers can use it.
export const AGENT_WORKING_COLOR = '#eab308'

export const AGENT_DOT_COLORS: Record<Exclude<AgentDotState, 'working' | 'monitoring'>, string> = {
  done: '#10b981',
  blocked: '#ef4444',
  waiting: '#ef4444',
  interrupted: '#ef4444',
  idle: 'rgba(115,115,115,0.4)'
}
