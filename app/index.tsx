import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { categoryColor, colors, font, radius, spacing } from '@/theme';
import { useSessions } from '@/store/sessions';
import { useSettings } from '@/store/settings';
import { usePath, type PathLesson } from '@/store/path';
import { useCoach } from '@/store/coach';
import { computeStreak } from '@/lib/streak';
import type { Session } from '@/types';

type Item =
  | { kind: 'record'; key: string }
  | { kind: 'recording'; key: string; session: Session }
  | { kind: 'lesson'; key: string; lesson: PathLesson }
  | { kind: 'review'; key: string; session: Session };

export default function HomeScreen() {
  const router = useRouter();
  const apiKey = useSettings((s) => s.apiKey);
  const sessions = useSessions((s) => s.sessions);
  const lessons = usePath((s) => s.lessons);
  const loadPath = usePath((s) => s.load);

  const coach = useCoach((s) => s.insight);
  const coachGenerating = useCoach((s) => s.generating);
  const coachLoaded = useCoach((s) => s.loaded);
  const loadCoach = useCoach((s) => s.load);
  const generateCoach = useCoach((s) => s.generate);

  useEffect(() => {
    loadPath();
    loadCoach();
  }, [loadPath, loadCoach]);

  const analysed = sessions.filter((s) => s.analysis).length;
  useEffect(() => {
    if (!apiKey || !coachLoaded || coachGenerating) return;
    if (analysed >= 2 && (!coach || analysed - coach.basis >= 2)) generateCoach();
  }, [apiKey, coachLoaded, coachGenerating, coach, analysed, generateCoach]);

  const streak = computeStreak(sessions);

  // Build ONE ordered journey: Record → newest recording + its lessons + a
  // review-its-mistakes step → older recordings…
  const items = useMemo<Item[]>(() => {
    const lessonsFor = (id: string) => lessons.filter((l) => l.sessionId === id);
    const desc = [...sessions].sort((a, b) => b.createdAt - a.createdAt);
    const out: Item[] = [{ kind: 'record', key: 'record' }];
    for (const s of desc) {
      out.push({ kind: 'recording', key: `rec_${s.id}`, session: s });
      for (const l of lessonsFor(s.id)) out.push({ kind: 'lesson', key: l.id, lesson: l });
      if ((s.analysis?.mistakes.length ?? 0) > 0) out.push({ kind: 'review', key: `rev_${s.id}`, session: s });
    }
    return out;
  }, [sessions, lessons]);

  const nextLessonId = items.find((i) => i.kind === 'lesson' && i.lesson.status !== 'completed')?.key;

  const open = (it: Item) => {
    if (it.kind === 'record') router.push('/record');
    else if (it.kind === 'recording') router.push(`/session/${it.session.id}`);
    else if (it.kind === 'lesson') router.push(`/practice/${it.lesson.id}`);
    else router.push(`/flashcards/${it.session.id}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable onPress={() => router.push('/settings')} hitSlop={10}>
              <Ionicons name="settings-outline" size={22} color={colors.text} />
            </Pressable>
          ),
        }}
      />

      {!apiKey && (
        <Pressable onPress={() => router.push('/settings')}>
          <View style={styles.warn}>
            <Ionicons name="key-outline" size={16} color={colors.warning} />
            <Text style={styles.warnText}>Add your OpenAI API key in Settings to begin.</Text>
          </View>
        </Pressable>
      )}

      {streak.current > 0 && <Text style={styles.streak}>🔥 {streak.current}-day streak</Text>}

      <View>
        {items.map((it, i) => (
          <Row
            key={it.key}
            item={it}
            isLast={i === items.length - 1}
            isNext={it.key === nextLessonId || (!nextLessonId && it.kind === 'record')}
            onPress={() => open(it)}
          />
        ))}
      </View>

      {/* Secondary: the AI coach (progress + what to record next) */}
      <Pressable
        onPress={() => router.push('/coach')}
        style={({ pressed }) => [styles.coachBtn, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="sparkles" size={16} color={colors.accent} />
        <Text style={styles.coachBtnText}>
          {coach ? 'Coach · progress & topics to try' : coachGenerating ? 'Coach is reading your progress…' : 'Coach · suggestions appear after a few clips'}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.accent} />
      </Pressable>
    </ScrollView>
  );
}

function Row({
  item,
  isLast,
  isNext,
  onPress,
}: {
  item: Item;
  isLast: boolean;
  isNext: boolean;
  onPress: () => void;
}) {
  const done = item.kind === 'lesson' && item.lesson.status === 'completed';

  let circleColor = colors.accent;
  let icon: keyof typeof Ionicons.glyphMap = 'ellipse';
  if (item.kind === 'record') icon = 'mic';
  else if (item.kind === 'recording') {
    icon = 'radio-button-on';
    circleColor = colors.textMuted;
  } else if (item.kind === 'lesson') {
    icon = done ? 'checkmark' : 'book';
    circleColor = done ? colors.success : categoryColor(item.lesson.category);
  } else {
    icon = 'albums';
    circleColor = colors.warning;
  }

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        {item.kind === 'recording' || item.kind === 'record' ? (
          <View style={[styles.milestone, { backgroundColor: circleColor }]}>
            <Ionicons name={icon} size={18} color={colors.accentText} />
          </View>
        ) : (
          <View style={[styles.dot, { backgroundColor: circleColor }, isNext && styles.dotNext]}>
            <Ionicons name={icon} size={13} color={colors.accentText} />
          </View>
        )}
        {!isLast && <View style={styles.connector} />}
      </View>

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          item.kind === 'recording' && styles.cardRecording,
          item.kind === 'record' && styles.cardRecord,
          isNext && styles.cardNext,
          pressed && { opacity: 0.85 },
        ]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          {item.kind === 'record' && (
            <>
              <Text style={styles.recordTitle}>Record a new clip</Text>
              <Text style={styles.recordSub}>Speak → I’ll build your next lessons</Text>
            </>
          )}
          {item.kind === 'recording' && (
            <>
              <Text style={styles.recDate}>
                {new Date(item.session.createdAt).toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
                {item.session.status === 'transcribing' || item.session.status === 'analyzing'
                  ? ' · analysing…'
                  : ''}
              </Text>
              <Text style={styles.recTopic} numberOfLines={2}>
                {item.session.topic}
              </Text>
            </>
          )}
          {item.kind === 'lesson' && (
            <Text style={[styles.lessonTitle, done && styles.lessonDone]} numberOfLines={2}>
              {item.lesson.title}
            </Text>
          )}
          {item.kind === 'review' && (
            <Text style={styles.reviewTitle}>
              Review these mistakes ({item.session.analysis?.mistakes.length} cards)
            </Text>
          )}
        </View>

        {isNext && item.kind === 'lesson' ? (
          <View style={styles.startPill}>
            <Ionicons name="play" size={13} color={colors.accentText} />
            <Text style={styles.startText}>Start</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        )}
      </Pressable>
    </View>
  );
}

const RAIL = 44;
const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  warn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.warning,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  warnText: { color: colors.warning, fontSize: font.small, flex: 1 },
  streak: { color: colors.accent, fontSize: font.small, fontWeight: '800' },

  row: { flexDirection: 'row', gap: spacing.sm },
  rail: { width: RAIL, alignItems: 'center' },
  milestone: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  dotNext: { borderWidth: 3, borderColor: colors.accentSoft },
  connector: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 2 },

  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardRecord: { backgroundColor: colors.accent, borderColor: colors.accent },
  cardRecording: { backgroundColor: colors.surfaceAlt },
  cardNext: { borderColor: colors.accent, borderWidth: 2 },

  recordTitle: { color: colors.accentText, fontSize: font.body, fontWeight: '800' },
  recordSub: { color: colors.accentText, fontSize: font.tiny, opacity: 0.85 },
  recDate: { color: colors.textFaint, fontSize: font.tiny, fontWeight: '700', textTransform: 'uppercase' },
  recTopic: { color: colors.text, fontSize: font.body, fontWeight: '700', lineHeight: 21 },
  lessonTitle: { color: colors.text, fontSize: font.small, fontWeight: '600', lineHeight: 19 },
  lessonDone: { color: colors.textMuted },
  reviewTitle: { color: colors.text, fontSize: font.small, fontWeight: '600' },
  startPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
  },
  startText: { color: colors.accentText, fontSize: font.small, fontWeight: '800' },

  coachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  coachBtnText: { color: colors.accent, fontSize: font.small, fontWeight: '700', flex: 1 },
});
