import { requireOptionalNativeModule } from 'expo-modules-core'

export type OrcaLiveUpdateModule = {
  /** True on Android 16+ where the ProgressStyle notification exists. */
  isSupported(): boolean
  /** Post or replace the lamps notification. `lamps[i]` lit = that agent is still working. */
  update(lamps: boolean[], title: string, body: string): void
  clear(): void
}

/** Null off Android (the module is Android-only) and in Expo Go. */
export const OrcaLiveUpdate = requireOptionalNativeModule<OrcaLiveUpdateModule>('OrcaLiveUpdate')
