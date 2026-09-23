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

/** Posts (or clears, when empty) the lamps notification. Android only; a no-op elsewhere. */
export function postAgentLamps(lamps: readonly AgentLamp[]): void {
  const native = Platform.OS === 'android' ? OrcaLiveUpdate : null
  if (!native) {
    return
  }
  if (lamps.length === 0) {
    native.clear()
    return
  }
  native.update([...lamps], 'Orca agents', agentLampSummary(lamps), agentLampChipText(lamps))
}

/** Mirrors the visible agent rows into the Android Live Update lamps notification. Cleared when
 *  the caller unmounts so a closed host screen never leaves stale lamps in the status bar. */
export function useAgentLampsLiveUpdate(
  worktrees: readonly { agents?: readonly AgentLampRow[] }[],
  now: number
): void {
  const lamps = agentLamps(worktrees, now)
  // Why a string key: `now` ticks every 30s and the list identity changes on every fetch, but
  // the notification only needs re-posting when a lamp actually changes state.
  const key = lamps.join(',')
  const native = Platform.OS === 'android' ? OrcaLiveUpdate : null

  useEffect(() => {
    if (!native) {
      return
    }
    postAgentLamps(key === '' ? [] : key.split(',').filter(isAgentLamp))
  }, [native, key])

  useEffect(() => {
    if (!native) {
      return
    }
    return () => native.clear()
  }, [native])
}
