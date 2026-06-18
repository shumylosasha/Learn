import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Empty, Pill } from '@/components/ui';
import { colors, font, spacing } from '@/theme';
import { useSessions } from '@/store/sessions';
import { formatDuration } from '@/lib/audio';
import type { Session } from '@/types';

export default function HistoryScreen() {
  const router = useRouter();
  const sessions = useSessions((s) => s.sessions);
  const deleteSession = useSessions((s) => s.deleteSession);

  // Group by calendar day so each day reads as one "lesson".
  const groups = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions) {
      const key = new Date(s.createdAt).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <Empty
        title="No recordings yet"
        subtitle="Record yourself on the Speak tab. Each recording shows up here, grouped by day."
      />
    );
  }

  const confirmDelete = (id: string) => {
    Alert.alert('Delete recording?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSession(id) },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {groups.map(([day, items]) => (
        <View key={day} style={{ gap: spacing.sm }}>
          <Text style={styles.dayHeader}>{day}</Text>
          {items.map((s) => (
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
                    {s.durationMs > 0 && (
                      <Text style={styles.histDate}>{formatDuration(s.durationMs)}</Text>
                    )}
                    <StatusTag status={s.status} count={s.analysis?.mistakes.length} />
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </Card>
            </Pressable>
          ))}
        </View>
      ))}
      <Text style={styles.hintCenter}>Long-press a recording to delete it.</Text>
    </ScrollView>
  );
}

function StatusTag({ status, count }: { status: string; count?: number }) {
  if (status === 'ready' && count != null) {
    return <Pill label={`${count} types`} color={colors.success} />;
  }
  if (status === 'error') return <Pill label="error" color={colors.danger} />;
  if (status === 'transcribing' || status === 'analyzing') {
    return <Pill label="processing…" color={colors.warning} />;
  }
  return <Pill label={status} color={colors.textMuted} />;
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  dayHeader: {
    color: colors.textMuted,
    fontSize: font.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  historyCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  histTopic: { color: colors.text, fontSize: font.body, fontWeight: '600', lineHeight: 21 },
  histMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  histDate: { color: colors.textFaint, fontSize: font.tiny },
  hintCenter: { color: colors.textFaint, fontSize: font.tiny, textAlign: 'center' },
});
