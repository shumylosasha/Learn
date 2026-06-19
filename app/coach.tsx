import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Empty, Pill, SectionTitle } from '@/components/ui';
import { colors, font, radius, spacing } from '@/theme';
import { useCoach } from '@/store/coach';
import { dueCards, useCards } from '@/store/cards';

export default function CoachScreen() {
  const router = useRouter();
  const insight = useCoach((s) => s.insight);
  const generating = useCoach((s) => s.generating);
  const loadCoach = useCoach((s) => s.load);
  const generate = useCoach((s) => s.generate);
  const cards = useCards((s) => s.cards);
  const loadCards = useCards((s) => s.load);

  useEffect(() => {
    loadCoach();
    loadCards();
  }, [loadCoach, loadCards]);

  const due = dueCards(cards).length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: 'Coach' }} />

      {/* Daily spaced review across all your past mistakes */}
      <Pressable
        onPress={() => router.push('/review')}
        style={({ pressed }) => [styles.reviewCard, pressed && { opacity: 0.9 }]}
      >
        <Ionicons name="albums" size={20} color={colors.accentText} />
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewTitle}>Daily review</Text>
          <Text style={styles.reviewSub}>
            {Object.keys(cards).length === 0
              ? 'Cards build from your recordings'
              : due > 0
                ? `${due} card${due === 1 ? '' : 's'} due now`
                : 'All caught up — come back later'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.accentText} />
      </Pressable>

      {!insight ? (
        <Empty
          title={generating ? 'Reading your progress…' : 'Not enough yet'}
          subtitle={
            generating
              ? 'Looking across your recordings.'
              : 'Record a couple of clips and your coach will assess your level and suggest topics.'
          }
        />
      ) : (
        <>
          <View>
            <View style={styles.head}>
              <SectionTitle>How you’re doing</SectionTitle>
              <Pill label={`Level ${insight.level}`} color={colors.success} filled />
            </View>
            <Card style={{ gap: spacing.md }}>
              <Text style={styles.summary}>{insight.summary}</Text>
              {insight.improving.length > 0 && (
                <Row label="Improving" items={insight.improving} color={colors.success} />
              )}
              {insight.persistent.length > 0 && (
                <Row label="Still slipping" items={insight.persistent} color={colors.danger} />
              )}
            </Card>
          </View>

          {insight.suggestedTopics.length > 0 && (
            <View>
              <SectionTitle>Record one of these next</SectionTitle>
              <View style={{ gap: spacing.sm }}>
                {insight.suggestedTopics.map((t, i) => (
                  <Pressable
                    key={i}
                    onPress={() => router.push({ pathname: '/record', params: { topic: t.title } })}
                    style={({ pressed }) => [styles.topic, pressed && { opacity: 0.85 }]}
                  >
                    <Ionicons name="mic-outline" size={18} color={colors.accent} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.topicTitle}>{t.title}</Text>
                      <Text style={styles.topicWhy}>{t.why}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <Button
            title={generating ? 'Updating…' : 'Update coach'}
            variant="secondary"
            loading={generating}
            onPress={generate}
          />
        </>
      )}
    </ScrollView>
  );
}

function Row({ label, items, color }: { label: string; items: string[]; color: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.chips}>
        {items.map((it, i) => (
          <Pill key={i} label={it} color={color} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md + 2,
  },
  reviewTitle: { color: colors.accentText, fontSize: font.body, fontWeight: '800' },
  reviewSub: { color: colors.accentText, fontSize: font.tiny, opacity: 0.85, marginTop: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summary: { color: colors.text, fontSize: font.body, lineHeight: 24 },
  rowLabel: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  topic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  topicTitle: { color: colors.text, fontSize: font.small, fontWeight: '700', lineHeight: 19 },
  topicWhy: { color: colors.textMuted, fontSize: font.tiny, marginTop: 2 },
});
