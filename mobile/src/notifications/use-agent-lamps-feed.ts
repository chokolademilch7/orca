import { useEffect, useMemo } from 'react'
import { useNow } from '../hooks/use-now'
import { useHostClient } from '../transport/host-client-hooks'
import { startHostWorktreeRefresh } from '../worktree/host-worktree-refresh'
import { WorktreeCatalogSnapshotClient } from '../worktree/worktree-catalog-snapshot-client'
import type { AgentLamp } from './agent-lamps'
import { saveAgentLampsSnapshot } from './agent-lamps-snapshot'
import { publishAgentLampsWorktrees, useAgentLampsWorktrees } from './agent-lamps-source'
import { useAgentLampsLiveUpdate } from './use-agent-lamps-live-update'

const noop = async (): Promise<void> => {}

/** Keeps the Android agent-lamps notification fed for the whole host group, and returns the same
 *  lamps for the in-app pill. The host list screen publishes its own worktree.ps results; `poll`
 *  is for when that screen is blurred (frozen) or unmounted, so nothing else would refresh the
 *  rows while the app is in the foreground. */
export function useAgentLampsFeed(hostId: string | undefined, poll: boolean): AgentLamp[] {
  const { client, state: connState } = useHostClient(hostId)
  const now = useNow(30_000)
  const worktrees = useAgentLampsWorktrees(hostId)
  const catalog = useMemo(() => new WorktreeCatalogSnapshotClient(), [])

  useEffect(() => {
    if (!poll || !hostId || !client || connState !== 'connected') {
      return
    }
    const fetchWorktrees = async (): Promise<void> => {
      const fetched = await catalog.fetch(client, hostId)
      if (fetched.kind !== 'response') {
        return
      }
      const confirmed = catalog.admit(fetched.pending)
      if (confirmed) {
        publishAgentLampsWorktrees(hostId, confirmed)
      }
    }
    return startHostWorktreeRefresh({ client, fetchWorktrees, fetchRepoMetadata: noop })
  }, [catalog, client, connState, hostId, poll])

  const lamps = useAgentLampsLiveUpdate(worktrees, now)

  // Why: a background push can only update a pane the foreground has seen; see agent-lamps-snapshot.
  useEffect(() => {
    if (hostId && worktrees.length > 0) {
      void saveAgentLampsSnapshot(hostId, worktrees)
    }
  }, [hostId, worktrees])

  return lamps
}
