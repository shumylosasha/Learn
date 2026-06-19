import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Empty, Pill } from '@/components/ui';
import { categoryColor, colors, font, radius, spacing } from '@/theme';
import { useSessions } from '@/store/sessions';
import type { Mistake } from '@/types';

export default function FlashcardsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useSessions((s) => s.sessions.find((x) => x.id === id));
  const mistakes = useMemo(() => session?.analysis?.mistakes ?? [], [session]);

  // Active-recall queue: "Review again" re-queues a card to the back.
  const [queue, setQueue] = useState<number[]>(() => mistakes.map((_, i) => i));
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  if (mistakes.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: 'Flashcards' }} />
        <Empty
          title="No cards yet"
          subtitle="This recording has no captured mistakes to turn into flashcards."
        />
      </>
    );
  }

  const total = mistakes.length;
  const done = queue.length === 0;
  const current: Mistake | undefined = done ? undefined : mistakes[queue[0]];

  const next = (gotIt: boolean) => {
    setReviewed((r) => r + 1);
    setQueue((q) => (gotIt ? q.slice(1) : [...q.slice(1), q[0]]));
    setFlipped(false);
  };

  const restart = () => {
    setQueue(mistakes.map((_, i) => i));
    setReviewed(0);
    setFlipped(false);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Flashcards' }} />

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(reviewed / (reviewed + queue.length || 1)) * 100}%` }]} />
      </View>
      <Text style={styles.counter}>{done ? 'Done' : `${queue.length} card${queue.length === 1 ? '' : 's'} to go`}</Text>

      {done ? (
        <ScrollView contentContainerStyle={styles.doneWrap}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>You worked through all {total} cards</Text>
          <Text style={styles.doneText}>
            Recall beats re-reading. Come back tomorrow and do them again — then record a new clip
            and try to use these out loud.
          </Text>
          <Button title="Go again" onPress={restart} style={{ alignSelf: 'stretch' }} />
          <Button
            title="Understand & practise (lesson)"
            variant="secondary"
            onPress={() => router.replace(`/practice/${id}`)}
            style={{ alignSelf: 'stretch' }}
          />
          <Button title="Done" variant="ghost" onPress={() => router.back()} style={{ alignSelf: 'stretch' }} />
        </ScrollView>
      ) : (
        <>
          <Pressable style={styles.card} onPress={() => setFlipped((f) => !f)}>
            {current && (
              <>
                <View style={styles.cardTop}>
                  <Pill label={current.category} color={categoryColor(current.category)} filled />
                  <Text style={styles.cardType} numberOfLines={1}>
                    {current.type}
                  </Text>
                </View>

                {!flipped ? (
                  <View style={styles.cardBody}>
                    <Text style={styles.prompt}>How would you say this correctly?</Text>
                    <Text style={styles.wrong}>“{current.quote}”</Text>
                    <Text style={styles.tapHint}>Tap to reveal</Text>
                  </View>
                ) : (
                  <View style={styles.cardBody}>
                    <Text style={styles.backLabel}>✅ Correct</Text>
                    <Text style={styles.right}>“{current.correction}”</Text>
                    <Text style={styles.backLabel}>💡 Why</Text>
                    <Text style={styles.why}>{current.explanation}</Text>
                  </View>
                )}
              </>
            )}
          </Pressable>

          {flipped ? (
            <View style={styles.actions}>
              <Button
                title="Review again"
                variant="secondary"
                onPress={() => next(false)}
                style={{ flex: 1 }}
              />
              <Button title="Got it" onPress={() => next(true)} style={{ flex: 1 }} />
            </View>
          ) : (
            <Pressable onPress={() => setFlipped(true)} style={styles.revealBtn}>
              <Ionicons name="eye-outline" size={18} color={colors.accent} />
              <Text style={styles.revealText}>Reveal answer</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg, gap: spacing.md },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: colors.accent },
  counter: { color: colors.textMuted, fontSize: font.small, textAlign: 'center' },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardType: { color: colors.textMuted, fontSize: font.small, fontWeight: '700', flex: 1 },
  cardBody: { flex: 1, justifyContent: 'center', gap: spacing.md },
  prompt: { color: colors.textMuted, fontSize: font.small, textAlign: 'center' },
  wrong: { color: colors.text, fontSize: font.h3, fontWeight: '700', textAlign: 'center', lineHeight: 28 },
  tapHint: { color: colors.textFaint, fontSize: font.tiny, textAlign: 'center', marginTop: spacing.md },
  backLabel: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  right: { color: colors.success, fontSize: font.h3, fontWeight: '700', lineHeight: 28 },
  why: { color: colors.text, fontSize: font.body, lineHeight: 23 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  revealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  revealText: { color: colors.accent, fontSize: font.body, fontWeight: '700' },
  doneWrap: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl },
  doneEmoji: { fontSize: 48 },
  doneTitle: { color: colors.text, fontSize: font.h3, fontWeight: '800', textAlign: 'center' },
  doneText: { color: colors.textMuted, fontSize: font.small, lineHeight: 21, textAlign: 'center', marginBottom: spacing.sm },
});
