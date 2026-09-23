import { useEffect } from 'react'
import { Platform } from 'react-native'
import { OrcaLiveUpdate } from '../../modules/orca-live-update/src'
import {
  agentLampChipText,
  agentLampSummary,
  agentLamps,
  isAgentLamp,
  type AgentLamp,
  type AgentLampRow
} from './agent-lamps'

// Why module state: two writers reach this notification — the foreground feed and the background
// push task — and neither can see the other's React state. Holding what was last posted here is
// what lets the foreground notice an out-of-band write and re-assert over it.
let lastPostedKey: string | null = null

function nativeLiveUpdate() {
  return Platform.OS === 'android' ? OrcaLiveUpdate : null
}

/** Posts (or clears, when empty) the lamps notification. Android only; a no-op elsewhere. */
export function postAgentLamps(lamps: readonly AgentLamp[]): void {
  const native = nativeLiveUpdate()
  if (!native) {
    return
  }
  const key = lamps.join(',')
  if (key === lastPostedKey) {
    return
  }
  lastPostedKey = key
  if (lamps.length === 0) {
    native.clear()
    return
  }
  native.update([...lamps], 'Orca agents', agentLampSummary(lamps), agentLampChipText(lamps))
}

/** Takes the notification down and forgets what was posted, so a remount posts again. */
export function clearAgentLamps(): void {
  lastPostedKey = null
  nativeLiveUpdate()?.clear()
}

export function resetAgentLampsPostStateForTests(): void {
  lastPostedKey = null
}

/** Mirrors the visible agent rows into the Android Live Update lamps notification. Cleared when
 *  the caller unmounts so a closed host screen never leaves stale lamps in the status bar. */
export function useAgentLampsLiveUpdate(
  worktrees: readonly { agents?: readonly AgentLampRow[] }[],
  now: number
): AgentLamp[] {
  const lamps = agentLamps(worktrees, now)
  const key = lamps.join(',')

  // Why `now` is a dependency: the background push task writes this same notification, and the
  // foreground cannot see that it did. Re-asserting on every tick makes the next tick repair an
  // out-of-band write; postAgentLamps drops the call when nothing actually changed.
  useEffect(() => {
    postAgentLamps(key === '' ? [] : key.split(',').filter(isAgentLamp))
  }, [key, now])

  useEffect(() => clearAgentLamps, [])

  return lamps
}
