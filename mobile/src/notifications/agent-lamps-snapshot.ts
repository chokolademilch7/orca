import AsyncStorage from '@react-native-async-storage/async-storage'
import type { RuntimeWorktreeAgentRow } from '../../../src/shared/runtime-types'
import { loadHostCatalog } from '../transport/host-store'
import { agentLamps, type AgentLampRow } from './agent-lamps'
import { resolveHostIdForFingerprint } from './push-host-fingerprint'
import type { OrcaPushPayload } from './push-payload'
import { postAgentLamps } from './use-agent-lamps-live-update'

// Why a snapshot: in the background nothing polls the host, but a push names the one pane whose
// state changed. Overlaying it on the last foreground rows keeps the notification current for
// the common case (an agent finishing or asking) without a wire change.
// ponytail: a pane that starts working while backgrounded stays unlit until the app resumes; the
// host never pushes "working". A silent lamps push (kind:'lamps') is the upgrade.
const KEY_PREFIX = 'orca:agentLamps:'

export type AgentLampSnapshotRow = AgentLampRow & { paneKey: string; worktreeId: string }

export function snapshotRows(
  worktrees: readonly { worktreeId: string; agents?: readonly RuntimeWorktreeAgentRow[] }[]
): AgentLampSnapshotRow[] {
  return worktrees.flatMap((worktree) =>
    (worktree.agents ?? []).map((row) => ({
      paneKey: row.paneKey,
      worktreeId: worktree.worktreeId,
      state: row.state,
      ...(row.workingMode ? { workingMode: row.workingMode } : {}),
      interrupted: row.interrupted,
      updatedAt: row.updatedAt
    }))
  )
}

export async function saveAgentLampsSnapshot(
  hostId: string,
  worktrees: readonly { worktreeId: string; agents?: readonly RuntimeWorktreeAgentRow[] }[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_PREFIX + hostId, JSON.stringify(snapshotRows(worktrees)))
  } catch {
    // A lost snapshot only costs one background overlay; the next foreground poll rewrites it.
  }
}

async function loadAgentLampsSnapshot(hostId: string): Promise<AgentLampSnapshotRow[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + hostId)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed)
      ? parsed.filter(
          (row): row is AgentLampSnapshotRow =>
            typeof row?.paneKey === 'string' && typeof row.updatedAt === 'number'
        )
      : []
  } catch {
    return []
  }
}

/** The pushed state written onto the matching pane, or onto every pane of the worktree when the
 *  host is too old to name the pane. Rows never seen in the foreground cannot be lit: without an
 *  updatedAt baseline they would be reported as stale immediately anyway. */
export function overlayPushOnSnapshot(
  rows: readonly AgentLampSnapshotRow[],
  payload: Pick<OrcaPushPayload, 'paneKey' | 'worktreeId' | 'agentState'>,
  now: number
): AgentLampSnapshotRow[] {
  if (!payload.agentState) {
    return [...rows]
  }
  const state = payload.agentState === 'needs-input' ? 'waiting' : 'done'
  const matches = (row: AgentLampSnapshotRow) =>
    payload.paneKey ? row.paneKey === payload.paneKey : row.worktreeId === payload.worktreeId
  return rows.map((row) =>
    matches(row) ? { ...row, state, interrupted: false, updatedAt: now } : row
  )
}

export async function applyPushToAgentLamps(payload: OrcaPushPayload): Promise<void> {
  if (!payload.agentState) {
    return
  }
  const hosts = await loadHostCatalog().catch(() => [])
  const hostId = resolveHostIdForFingerprint(payload.hostFingerprint, hosts)
  if (!hostId) {
    return
  }
  const now = Date.now()
  const rows = overlayPushOnSnapshot(await loadAgentLampsSnapshot(hostId), payload, now)
  try {
    await AsyncStorage.setItem(KEY_PREFIX + hostId, JSON.stringify(rows))
  } catch {
    // Same as above: the post below still reflects this push.
  }
  // Why no clear: a push reports ONE pane's state, never the fact that every agent has finished.
  // An unreadable, never-written, or fully decayed snapshot yields no lamps, and posting that
  // would cancel a notification the foreground had posted correctly (STA: the 11:22 blank window).
  const lamps = agentLamps([{ agents: rows }], now)
  if (lamps.length > 0) {
    postAgentLamps(lamps)
  }
}
