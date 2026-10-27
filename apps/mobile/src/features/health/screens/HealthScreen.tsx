import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { apiClient } from '../../../core/api';
import { colors, MIN_TOUCH_TARGET, spacing, typography } from '../../../core/theme';
import { StatusRow, type StatusTone } from '../components/StatusRow';
import { useHealth, usePlaintextProbe } from '../hooks';

export function HealthScreen() {
  const health = useHealth();
  const plaintext = usePlaintextProbe();

  let apiValue = 'Checking…';
  let apiTone: StatusTone = 'pending';
  if (health.isSuccess) {
    apiValue = `API healthy (up ${health.data.uptimeSeconds}s)`;
    apiTone = 'ok';
  } else if (health.isError) {
    apiValue = `Unreachable: ${health.error.message}`;
    apiTone = 'bad';
  }

  let plainValue = 'Checking…';
  let plainTone: StatusTone = 'pending';
  if (plaintext.data === 'blocked') {
    plainValue = 'Blocked (good)';
    plainTone = 'ok';
  } else if (plaintext.data === 'allowed') {
    plainValue = 'ALLOWED: plaintext traffic got through';
    plainTone = 'bad';
  }

  const refreshing = health.isFetching || plaintext.isFetching;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Connection status
      </Text>
      <StatusRow label="Server" value={apiClient.baseUrl} tone="pending" testID="api-url" />
      <StatusRow label="HTTPS" value={apiValue} tone={apiTone} testID="https-status" />
      <StatusRow label="Plain HTTP" value={plainValue} tone={plainTone} testID="http-status" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Check connection again"
        accessibilityState={{ disabled: refreshing, busy: refreshing }}
        disabled={refreshing}
        onPress={() => {
          void health.refetch();
          void plaintext.refetch();
        }}
        style={({ pressed }) => [styles.button, (pressed || refreshing) && styles.buttonDim]}
      >
        <Text style={styles.buttonText}>{refreshing ? 'Checking…' : 'Check again'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, backgroundColor: colors.background, flexGrow: 1 },
  title: { ...typography.title, color: colors.text, marginBottom: spacing.md },
  button: {
    marginTop: spacing.xl,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonDim: { opacity: 0.7 },
  buttonText: { ...typography.label, color: colors.onPrimary, fontSize: 16 },
});
