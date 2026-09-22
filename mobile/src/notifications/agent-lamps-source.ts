import { useSyncExternalStore } from 'react'
import type { Worktree } from '../worktree/workspace-list-types'

// Why a module store: the lamps notification must outlive the host list screen (a blurred stack
// screen is frozen, so its effects stop), and every worktree.ps result — from that screen or from
// the layout-level poller — is the same feed.
const rowsByHost = new Map<string, readonly Worktree[]>()
const listeners = new Set<() => void>()
const EMPTY: readonly Worktree[] = []

export function publishAgentLampsWorktrees(hostId: string, worktrees: readonly Worktree[]): void {
  if (rowsByHost.get(hostId) === worktrees) {
    return
  }
  rowsByHost.set(hostId, worktrees)
  listeners.forEach((notify) => notify())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useAgentLampsWorktrees(hostId: string | undefined): readonly Worktree[] {
  return useSyncExternalStore(
    subscribe,
    () => (hostId ? (rowsByHost.get(hostId) ?? EMPTY) : EMPTY),
    () => EMPTY
  )
}

export function resetAgentLampsSourceForTests(): void {
  rowsByHost.clear()
}
