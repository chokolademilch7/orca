import { useEffect } from 'react'
import { Platform } from 'react-native'
import type { RuntimeWorktreeAgentRow } from '../../../src/shared/runtime-types'
import { OrcaLiveUpdate } from '../../modules/orca-live-update/src'
import { agentLampSummary, agentLamps } from './agent-lamps'

/** Mirrors the visible agent rows into the Android Live Update lamps notification. Cleared when
 *  the caller unmounts so a closed host screen never leaves stale lamps in the status bar. */
export function useAgentLampsLiveUpdate(
  worktrees: readonly { agents?: readonly RuntimeWorktreeAgentRow[] }[],
  now: number
): void {
  const lamps = agentLamps(worktrees, now)
  // Why a string key: `now` ticks every 30s and the list identity changes on every fetch, but
  // the notification only needs re-posting when a lamp actually flips.
  const key = lamps.map((lit) => (lit ? '1' : '0')).join('')
  const native = Platform.OS === 'android' ? OrcaLiveUpdate : null

  useEffect(() => {
    if (!native) {
      return
    }
    if (key === '') {
      native.clear()
      return
    }
    const current = key.split('').map((c) => c === '1')
    native.update(current, 'Orca agents', agentLampSummary(current))
  }, [native, key])

  useEffect(() => {
    if (!native) {
      return
    }
    return () => native.clear()
  }, [native])
}
