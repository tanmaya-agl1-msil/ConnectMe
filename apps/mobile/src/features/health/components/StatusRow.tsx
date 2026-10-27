import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../core/theme';

export type StatusTone = 'ok' | 'bad' | 'pending';

interface Props {
  label: string;
  value: string;
  tone: StatusTone;
  testID?: string;
}

const toneColor: Record<StatusTone, string> = {
  ok: colors.success,
  bad: colors.danger,
  pending: colors.textMuted,
};

/** One labelled status line. Read by screen readers as a single "label: value" item. */
export function StatusRow({ label, value, tone, testID }: Props) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${label}: ${value}`}
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: toneColor[tone] }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  label: { ...typography.label, color: colors.textMuted, marginBottom: spacing.xs },
  value: { ...typography.body },
});
