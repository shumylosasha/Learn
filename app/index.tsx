import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { categoryColor, colors, font, radius, spacing } from '@/theme';
import { useSessions } from '@/store/sessions';
import { useSettings } from '@/store/settings';
import { usePath, type PathLesson } from '@/store/path';
import { computeStreak } from '@/lib/streak';
import type { Session } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const apiKey = useSettings((s) => s.apiKey);
  const sessions = useSessions((s) => s.sessions);
  const lessons = usePath((s) => s.lessons);
  const load = usePath((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  const streak = computeStreak(sessions);
  const sessionsDesc = [...sessions].sort((a, b) => b.createdAt - a.createdAt);
  const lessonsFor = (id: string) => lessons.filter((l) => l.sessionId === id);

  // The single "what's next": the newest not-yet-done lesson.
  const pending = [...lessons].filter((l) => l.status !== 'completed').sort((a, b) => b.createdAt - a.createdAt);
  const next = pending[0];

  const gear = () => (
    <Pressable onPress={() => router.push('/settings')} hitSlop={10}>
      <Ionicons name="settings-outline" size={22} color={colors.text} />
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ headerLeft: gear }} />

      {!apiKey && (
        <Pressable onPress={() => router.push('/settings')}>
          <View style={styles.warn}>
            <Ionicons name="key-outline" size={16} color={colors.warning} />
            <Text style={styles.warnText}>Add your OpenAI API key in Settings to begin.</Text>
          </View>
        </Pressable>
      )}

      {streak.current > 0 && (
        <Text style={styles.streak}>🔥 {streak.current}-day streak</Text>
      )}

      {/* ── The single clear next step ───────────────────────────── */}
      {next ? (
        <Pressable
          onPress={() => router.push(`/practice/${next.id}`)}
          style={({ pressed }) => [styles.hero, pressed && { opacity: 0.92 }]}
        >
          <Text style={styles.heroKicker}>NEXT LESSON</Text>
          <Text style={styles.heroTitle}>{next.title}</Text>
          <View style={styles.heroBtn}>
            <Ionicons name="play" size={18} color={colors.accent} />
            <Text style={styles.heroBtnText}>Start</Text>
          </View>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => router.push('/record')}
          style={({ pressed }) => [styles.hero, pressed && { opacity: 0.92 }]}
        >
          <Text style={styles.heroKicker}>
            {sessions.length === 0 ? 'START HERE' : "YOU'RE ALL CAUGHT UP"}
          </Text>
          <Text style={styles.heroTitle}>
            {sessions.length === 0 ? 'Record your first clip' : 'Record today’s clip'}
          </Text>
          <View style={styles.heroBtn}>
            <Ionicons name="mic" size={18} color={colors.accent} />
            <Text style={styles.heroBtnText}>Record</Text>
          </View>
        </Pressable>
      )}

      {/* A smaller record button is always available when there ARE lessons. */}
      {next && (
        <Pressable onPress={() => router.push('/record')} style={styles.recordLink}>
          <Ionicons name="mic-outline" size={16} color={colors.accent} />
          <Text style={styles.recordLinkText}>Record a new clip</Text>
        </Pressable>
      )}

      {/* ── History: each recording and its lessons ──────────────── */}
      {sessionsDesc.length > 0 && (
        <View style={{ gap: spacing.lg, marginTop: spacing.sm }}>
          <Text style={styles.historyHead}>Your recordings</Text>
          {sessionsDesc.map((s) => (
            <RecordingGroup
              key={s.id}
              session={s}
              lessons={lessonsFor(s.id)}
              nextId={next?.id}
              onOpenRecording={() => router.push(`/session/${s.id}`)}
              onOpenLesson={(id) => router.push(`/practice/${id}`)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function RecordingGroup({
  session,
  lessons,
  nextId,
  onOpenRecording,
  onOpenLesson,
}: {
  session: Session;
  lessons: PathLesson[];
  nextId?: string;
  onOpenRecording: () => void;
  onOpenLesson: (id: string) => void;
}) {
  const date = new Date(session.createdAt).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const done = lessons.filter((l) => l.status === 'completed').length;
  const processing = session.status === 'transcribing' || session.status === 'analyzing';

  return (
    <View style={styles.group}>
      <Pressable onPress={onOpenRecording} style={styles.groupHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.groupDate}>{date}</Text>
          <Text style={styles.groupTopic} numberOfLines={2}>
            {session.topic}
          </Text>
        </View>
        <Text style={styles.groupMeta}>
          {processing
            ? 'Analysing…'
            : session.status === 'error'
              ? 'Error'
              : lessons.length > 0
                ? `${done}/${lessons.length}`
                : 'See mistakes'}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
      </Pressable>

      {lessons.map((l) => {
        const isDone = l.status === 'completed';
        const isNext = l.id === nextId;
        return (
          <Pressable
            key={l.id}
            onPress={() => onOpenLesson(l.id)}
            style={({ pressed }) => [styles.lessonRow, isNext && styles.lessonRowNext, pressed && { opacity: 0.85 }]}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: isDone ? colors.success : categoryColor(l.category) },
              ]}
            >
              {isDone ? (
                <Ionicons name="checkmark" size={13} color={colors.accentText} />
              ) : (
                <Ionicons name="book-outline" size={12} color={colors.accentText} />
              )}
            </View>
            <Text style={[styles.lessonTitle, isDone && styles.lessonTitleDone]} numberOfLines={1}>
              {l.title}
            </Text>
            {isNext && <Text style={styles.nextTag}>NEXT</Text>}
            <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />
          </Pressable>
        );
      })}

      {!processing && session.analysis && lessons.length === 0 && (
        <Text style={styles.preparing}>Preparing lessons…</Text>
      )}
    </View>
  );
}

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
  hero: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroKicker: { color: colors.accentText, fontSize: font.tiny, fontWeight: '800', letterSpacing: 1, opacity: 0.85 },
  heroTitle: { color: colors.accentText, fontSize: font.h2, fontWeight: '800', lineHeight: 28 },
  heroSub: { color: colors.accentText, fontSize: font.small, opacity: 0.85 },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.accentText,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  heroBtnText: { color: colors.accent, fontSize: font.body, fontWeight: '800' },
  recordLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  recordLinkText: { color: colors.accent, fontSize: font.small, fontWeight: '700' },
  historyHead: {
    color: colors.textMuted,
    fontSize: font.tiny,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  groupDate: { color: colors.textFaint, fontSize: font.tiny, fontWeight: '700', textTransform: 'uppercase' },
  groupTopic: { color: colors.text, fontSize: font.body, fontWeight: '700', lineHeight: 21, marginTop: 1 },
  groupMeta: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '700' },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
  },
  lessonRowNext: { borderWidth: 1.5, borderColor: colors.accent },
  dot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  lessonTitle: { color: colors.text, fontSize: font.small, fontWeight: '600', flex: 1 },
  lessonTitleDone: { color: colors.textMuted },
  nextTag: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  preparing: { color: colors.textFaint, fontSize: font.tiny, fontStyle: 'italic' },
});
