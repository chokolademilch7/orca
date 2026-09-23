import { Pressable, StyleSheet, Text, View } from 'react-native'
import { agentLampCounts, type AgentLamp } from '../notifications/agent-lamps'
import { colors, spacing, typography } from '../theme/mobile-theme'
import { AGENT_DOT_COLORS, AGENT_WORKING_COLOR } from './agent-state-colors'

const LAMP_COLORS: Record<AgentLamp, string> = {
  attention: AGENT_DOT_COLORS.blocked,
  working: AGENT_WORKING_COLOR,
  done: AGENT_DOT_COLORS.done
}

const LAMP_LABELS: Record<AgentLamp, string> = {
  attention: 'waiting',
  working: 'working',
  done: 'done'
}

/** The status-bar chip's rollup, brought inside the app. Android hides the real chip while Orca
 *  is the foreground app, so a route that covers the worktree list would otherwise show no agent
 *  state at all. */
export function AgentLampsPill({
  lamps,
  onPress
}: {
  lamps: readonly AgentLamp[]
  onPress?: () => void
}) {
  const counts = agentLampCounts(lamps)
  if (counts.length === 0) {
    return null
  }
  const label = counts.map(({ lamp, count }) => `${count} ${LAMP_LABELS[lamp]}`).join(', ')
  return (
    <Pressable
      style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Agents: ${label}`}
      onPress={onPress}
    >
      {counts.map(({ lamp, count }) => (
        <View key={lamp} style={styles.entry}>
          <View style={[styles.dot, { backgroundColor: LAMP_COLORS[lamp] }]} />
          <Text style={styles.count}>{count}</Text>
        </View>
      ))}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    // Fully round, matching the system chip this stands in for; not a documented radius tier.
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.bgRaised
  },
  pillPressed: { opacity: 0.7 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 6, height: 6, borderRadius: 3 },
  count: { color: colors.textSecondary, fontSize: typography.metaSize }
})
