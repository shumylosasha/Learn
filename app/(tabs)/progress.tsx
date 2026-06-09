import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Empty, Pill, SectionTitle } from '@/components/ui';
import { categoryColor, colors, font, radius, spacing } from '@/theme';
import { useSessions } from '@/store/sessions';
import { aggregateRecurringMistakes, countByCategory } from '@/lib/mistakes';
import { formatDuration } from '@/lib/audio';

export default function ProgressScreen() {
  const router = useRouter();
  const sessions = useSessions((s) => s.sessions);
  const deleteSession = useSessions((s) => s.deleteSession);

  const analysed = sessions.filter((s) => s.analysis);
  const recurring = aggregateRecurringMistakes(sessions);
  const byCat = countByCategory(recurring);

  if (sessions.length === 0) {
    return (
      <Empty
        title="No sessions yet"
        subtitle="Record yourself speaking on the Speak tab. Your recurring mistakes and history will show up here."
      />
    );
  }

  const confirmDelete = (id: string) => {
    Alert.alert('Delete session?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSession(id) },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.statsCard}>
        <Stat value={sessions.length} label="Sessions" />
        <Stat value={recurring.reduce((a, r) => a + r.count, 0)} label="Mistakes logged" />
        <Stat value={recurring.length} label="Distinct issues" />
      </Card>

      {recurring.length > 0 && (
        <View>
          <SectionTitle>Recurring mistakes (work on these)</SectionTitle>
          <View style={styles.catRow}>
            {(['grammar', 'vocabulary', 'register'] as const).map((c) => (
              <Pill key={c} label={`${c} ${byCat[c] ?? 0}`} color={categoryColor(c)} />
            ))}
          </View>
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            {recurring.slice(0, 12).map((r) => (
              <Card key={r.type} style={{ gap: 6 }}>
                <View style={styles.recHeader}>
                  <View
                    style={[styles.catDot, { backgroundColor: categoryColor(r.category) }]}
                  />
                  <Text style={styles.recType}>{r.type}</Text>
                  <Pill label={`${r.count}×`} color={colors.warning} filled />
                </View>
                <Text style={styles.recExample}>
                  <Text style={{ color: colors.danger }}>“{r.lastQuote}”</Text>
                  {'  →  '}
                  <Text style={{ color: colors.success }}>“{r.lastCorrection}”</Text>
                </Text>
              </Card>
            ))}
          </View>
        </View>
      )}

      <View>
        <SectionTitle>History</SectionTitle>
        <View style={{ gap: spacing.sm }}>
          {sessions.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => router.push(`/session/${s.id}`)}
              onLongPress={() => confirmDelete(s.id)}
            >
              <Card style={styles.historyCard}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.histTopic} numberOfLines={2}>
                    {s.topic}
                  </Text>
                  <View style={styles.histMeta}>
                    <Text style={styles.histDate}>
                      {new Date(s.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                    {s.durationMs > 0 && (
                      <Text style={styles.histDate}>· {formatDuration(s.durationMs)}</Text>
                    )}
                    <StatusTag status={s.status} count={s.analysis?.mistakes.length} />
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </Card>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>Long-press a session to delete it.</Text>
      </View>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StatusTag({ status, count }: { status: string; count?: number }) {
  if (status === 'ready' && count != null) {
    return <Pill label={`${count} fixes`} color={colors.success} />;
  }
  if (status === 'error') return <Pill label="error" color={colors.danger} />;
  if (status === 'transcribing' || status === 'analyzing') {
    return <Pill label="processing…" color={colors.warning} />;
  }
  return <Pill label={status} color={colors.textMuted} />;
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  statsCard: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { color: colors.text, fontSize: font.h1, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: font.tiny, textTransform: 'uppercase', letterSpacing: 0.5 },
  catRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  recType: { color: colors.text, fontSize: font.body, fontWeight: '700', flex: 1 },
  recExample: { fontSize: font.small, lineHeight: 20 },
  historyCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  histTopic: { color: colors.text, fontSize: font.body, fontWeight: '600', lineHeight: 21 },
  histMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  histDate: { color: colors.textFaint, fontSize: font.tiny },
  hint: { color: colors.textFaint, fontSize: font.tiny, textAlign: 'center', marginTop: spacing.md },
});
