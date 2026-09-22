import { requireOptionalNativeModule } from 'expo-modules-core'
import type { AgentLamp } from '../../../src/notifications/agent-lamps'

export type OrcaLiveUpdateModule = {
  /** True on Android 16+ where the ProgressStyle notification exists. */
  isSupported(): boolean
  /** Post or replace the lamps notification, one segment per agent state; `chipText` is the
   *  monochrome status-bar chip label. */
  update(lamps: AgentLamp[], title: string, body: string, chipText: string): void
  clear(): void
}

/** Null off Android (the module is Android-only) and in Expo Go. */
export const OrcaLiveUpdate = requireOptionalNativeModule<OrcaLiveUpdateModule>('OrcaLiveUpdate')
