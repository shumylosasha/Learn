import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { categoryColor, font, type Palette, radius, spacing, useColors } from '@/theme';
import { useSessions } from '@/store/sessions';
import { useSettings } from '@/store/settings';
import { usePath, type PathLesson } from '@/store/path';
import { useCoach } from '@/store/coach';
import { dueCards, useCards } from '@/store/cards';
import { useReviewed } from '@/store/reviewed';
import { computeStreak } from '@/lib/streak';
import type { Session } from '@/types';

type Item =
  | { kind: 'record'; key: string }
  | { kind: 'dailyReview'; key: string; due: number; total: number }
  | { kind: 'recording'; key: string; session: Session }
  | { kind: 'lesson'; key: string; lesson: PathLesson }
  | { kind: 'review'; key: string; session: Session; reviewed: boolean }
  | { kind: 'coachProgress'; key: string; level: string; summary: string }
  | { kind: 'coachTopic'; key: string; title: string; why: string };

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const apiKey = useSettings((s) => s.apiKey);
  const sessions = useSessions((s) => s.sessions);
  const lessons = usePath((s) => s.lessons);
  const loadPath = usePath((s) => s.load);
  const cards = useCards((s) => s.cards);
  const loadCards = useCards((s) => s.load);
  const reviewedIds = useReviewed((s) => s.ids);
  const loadReviewed = useReviewed((s) => s.load);

  const coach = useCoach((s) => s.insight);
  const coachGenerating = useCoach((s) => s.generating);
  const coachLoaded = useCoach((s) => s.loaded);
  const loadCoach = useCoach((s) => s.load);
  const generateCoach = useCoach((s) => s.generate);

  useEffect(() => {
    loadPath();
    loadCoach();
    loadCards();
    loadReviewed();
  }, [loadPath, loadCoach, loadCards, loadReviewed]);

  const analysed = sessions.filter((s) => s.analysis).length;
  useEffect(() => {
    if (!apiKey || !coachLoaded || coachGenerating) return;
    if (analysed >= 2 && (!coach || analysed - coach.basis >= 2)) generateCoach();
  }, [apiKey, coachLoaded, coachGenerating, coach, analysed, generateCoach]);

  const streak = computeStreak(sessions);
  const due = useMemo(() => dueCards(cards).length, [cards]);
  const totalCards = Object.keys(cards).length;

  // Build ONE ordered journey: Record → daily review → newest recording + its
  // lessons + a review-its-mistakes step → older recordings… → coach (progress +
  // topics to record next). The coach is woven in as the next things to practise.
  const items = useMemo<Item[]>(() => {
    const lessonsFor = (id: string) => lessons.filter((l) => l.sessionId === id);
    const desc = [...sessions].sort((a, b) => b.createdAt - a.createdAt);
    const out: Item[] = [{ kind: 'record', key: 'record' }];
    if (totalCards > 0) out.push({ kind: 'dailyReview', key: 'daily', due, total: totalCards });
    for (const s of desc) {
      out.push({ kind: 'recording', key: `rec_${s.id}`, session: s });
      for (const l of lessonsFor(s.id)) out.push({ kind: 'lesson', key: l.id, lesson: l });
      if ((s.analysis?.mistakes.length ?? 0) > 0)
        out.push({ kind: 'review', key: `rev_${s.id}`, session: s, reviewed: !!reviewedIds[s.id] });
    }
    if (coach) {
      out.push({
        kind: 'coachProgress',
        key: 'coach',
        level: coach.level,
        summary: coach.summary,
      });
      for (let i = 0; i < Math.min(3, coach.suggestedTopics.length); i++) {
        const t = coach.suggestedTopics[i];
        out.push({ kind: 'coachTopic', key: `topic_${i}`, title: t.title, why: t.why });
      }
    }
    return out;
  }, [sessions, lessons, totalCards, due, reviewedIds, coach]);

  const nextLessonId = items.find((i) => i.kind === 'lesson' && i.lesson.status !== 'completed')?.key;

  const open = (it: Item) => {
    if (it.kind === 'record') router.push('/record');
    else if (it.kind === 'dailyReview') router.push('/review');
    else if (it.kind === 'recording') router.push(`/session/${it.session.id}`);
    else if (it.kind === 'lesson') router.push(`/practice/${it.lesson.id}`);
    else if (it.kind === 'review') router.push(`/flashcards/${it.session.id}`);
    else if (it.kind === 'coachProgress') router.push('/coach');
    else if (it.kind === 'coachTopic') router.push({ pathname: '/record', params: { topic: it.title } });
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
            colors={colors}
            styles={styles}
            isLast={i === items.length - 1}
            isNext={it.key === nextLessonId || (!nextLessonId && it.kind === 'record')}
            coachGenerating={coachGenerating}
            onPress={() => open(it)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function Row({
  item,
  colors,
  styles,
  isLast,
  isNext,
  coachGenerating,
  onPress,
}: {
  item: Item;
  colors: Palette;
  styles: ReturnType<typeof makeStyles>;
  isLast: boolean;
  isNext: boolean;
  coachGenerating: boolean;
  onPress: () => void;
}) {
  const done =
    (item.kind === 'lesson' && item.lesson.status === 'completed') ||
    (item.kind === 'review' && item.reviewed);
  const dueNow = item.kind === 'dailyReview' && item.due > 0;

  let circleColor = colors.accent;
  let icon: keyof typeof Ionicons.glyphMap = 'ellipse';
  if (item.kind === 'record') icon = 'mic';
  else if (item.kind === 'dailyReview') {
    icon = 'flame';
    circleColor = dueNow ? colors.accent : colors.textMuted;
  } else if (item.kind === 'recording') {
    icon = 'radio-button-on';
    circleColor = colors.textMuted;
  } else if (item.kind === 'lesson') {
    icon = done ? 'checkmark' : 'book';
    circleColor = done ? colors.success : categoryColor(item.lesson.category);
  } else if (item.kind === 'review') {
    icon = done ? 'checkmark' : 'albums';
    circleColor = done ? colors.success : colors.warning;
  } else if (item.kind === 'coachProgress') {
    icon = 'sparkles';
    circleColor = colors.accent;
  } else {
    icon = 'bulb';
    circleColor = colors.accent;
  }

  const isMilestone = item.kind === 'recording' || item.kind === 'record';

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        {isMilestone ? (
          <View style={[styles.milestone, { backgroundColor: circleColor }]}>
            <Ionicons name={icon} size={18} color={colors.accentText} />
          </View>
        ) : (
          <View
            style={[
              styles.dot,
              { backgroundColor: circleColor },
              isNext && styles.dotNext,
              done && styles.dotDone,
            ]}
          >
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
          item.kind === 'coachProgress' && styles.cardCoach,
          isNext && styles.cardNext,
          dueNow && styles.cardNext,
          done && styles.cardDone,
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
          {item.kind === 'dailyReview' && (
            <>
              <Text style={styles.lessonTitle}>Daily review</Text>
              <Text style={styles.subText}>
                {item.due > 0
                  ? `${item.due} card${item.due === 1 ? '' : 's'} due now`
                  : 'All caught up — come back later'}
              </Text>
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
            <Text style={[styles.lessonTitle, done && styles.doneTitle]} numberOfLines={2}>
              {item.lesson.title}
            </Text>
          )}
          {item.kind === 'review' && (
            <Text style={[styles.reviewTitle, done && styles.doneTitle]}>
              {done
                ? 'Mistakes reviewed'
                : `Review these mistakes (${item.session.analysis?.mistakes.length} cards)`}
            </Text>
          )}
          {item.kind === 'coachProgress' && (
            <>
              <Text style={styles.coachTitle}>
                Coach · {coachGenerating ? 'updating…' : `level ${item.level}`}
              </Text>
              <Text style={styles.subText} numberOfLines={2}>
                {item.summary}
              </Text>
            </>
          )}
          {item.kind === 'coachTopic' && (
            <>
              <Text style={styles.lessonTitle}>{item.title}</Text>
              <Text style={styles.subText}>{item.why}</Text>
            </>
          )}
        </View>

        {isNext && item.kind === 'lesson' ? (
          <View style={styles.startPill}>
            <Ionicons name="play" size={13} color={colors.accentText} />
            <Text style={styles.startText}>Start</Text>
          </View>
        ) : item.kind === 'coachTopic' ? (
          <Ionicons name="mic-outline" size={18} color={colors.accent} />
        ) : (
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        )}
      </Pressable>
    </View>
  );
}

const RAIL = 44;
const makeStyles = (colors: Palette) =>
  StyleSheet.create({
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
    dotDone: { opacity: 0.6 },
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
    cardCoach: { backgroundColor: colors.accentSoft, borderColor: colors.accentSoft },
    cardNext: { borderColor: colors.accent, borderWidth: 2 },
    cardDone: { opacity: 0.5 },

    recordTitle: { color: colors.accentText, fontSize: font.body, fontWeight: '800' },
    recordSub: { color: colors.accentText, fontSize: font.tiny, opacity: 0.85 },
    recDate: { color: colors.textFaint, fontSize: font.tiny, fontWeight: '700', textTransform: 'uppercase' },
    recTopic: { color: colors.text, fontSize: font.body, fontWeight: '700', lineHeight: 21 },
    lessonTitle: { color: colors.text, fontSize: font.small, fontWeight: '600', lineHeight: 19 },
    subText: { color: colors.textMuted, fontSize: font.tiny, lineHeight: 16, marginTop: 1 },
    doneTitle: { color: colors.textFaint, textDecorationLine: 'line-through' },
    reviewTitle: { color: colors.text, fontSize: font.small, fontWeight: '600' },
    coachTitle: { color: colors.accent, fontSize: font.small, fontWeight: '800' },
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
  });
