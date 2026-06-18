import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Empty, SectionTitle } from '@/components/ui';
import { categoryColor, colors, font, radius, spacing } from '@/theme';
import { useSessions } from '@/store/sessions';
import { useSettings } from '@/store/settings';
import { useLessons } from '@/store/lessons';
import { generateLearningPath } from '@/api/openai';
import { aggregateRecurringMistakes, recurringMistakesContext } from '@/lib/mistakes';
import type { Lesson } from '@/types';

export default function LearnScreen() {
  const router = useRouter();
  const sessions = useSessions((s) => s.sessions);
  const apiKey = useSettings((s) => s.apiKey);
  const prefs = useSettings((s) => s.prefs);
  const lessons = useLessons((s) => s.lessons);
  const loaded = useLessons((s) => s.loaded);
  const loadLessons = useLessons((s) => s.load);
  const setFromSpecs = useLessons((s) => s.setFromSpecs);

  const [building, setBuilding] = useState(false);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  const recurring = useMemo(() => aggregateRecurringMistakes(sessions), [sessions]);
  const hasMistakes = recurring.length > 0;
  const completedCount = lessons.filter((l) => l.status === 'completed').length;

  const build = async () => {
    if (!apiKey) {
      Alert.alert('Add your API key', 'Set your OpenAI key in Settings first.');
      return;
    }
    if (!hasMistakes) {
      Alert.alert('Record first', 'Make a few recordings so the AI can find what to teach you.');
      return;
    }
    setBuilding(true);
    try {
      const specs = await generateLearningPath(
        apiKey,
        prefs.analysisModel,
        recurringMistakesContext(recurring, 12),
      );
      if (specs.length === 0) {
        Alert.alert('Nothing to build yet', 'Record a bit more and try again.');
      } else {
        setFromSpecs(specs);
      }
    } catch (e) {
      Alert.alert('Could not build your path', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBuilding(false);
    }
  };

  if (loaded && lessons.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Empty
          title="Build your learning path"
          subtitle={
            hasMistakes
              ? 'Turn your recurring mistakes into focused lessons — each with a bit of theory and targeted practice.'
              : 'Record yourself on the Speak tab first. Once the AI sees your recurring mistakes, it builds lessons here.'
          }
        />
        <Button
          title={building ? 'Building your lessons…' : 'Build my learning path'}
          onPress={build}
          loading={building}
          disabled={!hasMistakes || building}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable
        onPress={() => router.push('/practice/weakspots')}
        style={({ pressed }) => [styles.freeCta, pressed && { opacity: 0.9 }]}
      >
        <Ionicons name="chatbubbles" size={20} color={colors.accentText} />
        <View style={{ flex: 1 }}>
          <Text style={styles.freeTitle}>Free practice</Text>
          <Text style={styles.freeSub}>Open-ended tutor across all your weak spots</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.accentText} />
      </Pressable>

      <View style={styles.pathHead}>
        <SectionTitle>Your learning path</SectionTitle>
        {lessons.length > 0 && (
          <Text style={styles.pathProgress}>
            {completedCount}/{lessons.length} done
          </Text>
        )}
      </View>

      <View style={{ gap: spacing.sm }}>
        {lessons.map((lesson, i) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            index={i}
            onOpen={() => router.push(`/practice/${lesson.id}`)}
          />
        ))}
      </View>

      <Button
        title={building ? 'Rebuilding…' : 'Rebuild path from latest mistakes'}
        variant="secondary"
        onPress={build}
        loading={building}
        disabled={building}
        style={{ marginTop: spacing.sm }}
      />
      <Text style={styles.rebuildHint}>
        Completed lessons stay ticked if they return. New mistakes add new lessons.
      </Text>
    </ScrollView>
  );
}

function LessonCard({
  lesson,
  index,
  onOpen,
}: {
  lesson: Lesson;
  index: number;
  onOpen: () => void;
}) {
  const done = lesson.status === 'completed';
  return (
    <Pressable onPress={onOpen}>
      <Card style={styles.lessonCard}>
        <View
          style={[
            styles.badge,
            { backgroundColor: done ? colors.success : categoryColor(lesson.category) },
          ]}
        >
          {done ? (
            <Ionicons name="checkmark" size={16} color={colors.accentText} />
          ) : (
            <Text style={styles.badgeNum}>{index + 1}</Text>
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.lessonTitle}>{lesson.title}</Text>
          <Text style={styles.lessonSummary} numberOfLines={2}>
            {lesson.summary}
          </Text>
          <Text style={[styles.lessonCat, { color: categoryColor(lesson.category) }]}>
            {lesson.category}
            {done ? ' · completed' : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  freeCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md + 2,
  },
  freeTitle: { color: colors.accentText, fontSize: font.body, fontWeight: '800' },
  freeSub: { color: colors.accentText, fontSize: font.tiny, opacity: 0.85, marginTop: 1 },
  pathHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  pathProgress: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '700' },
  lessonCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNum: { color: colors.accentText, fontSize: font.small, fontWeight: '800' },
  lessonTitle: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  lessonSummary: { color: colors.textMuted, fontSize: font.small, lineHeight: 19 },
  lessonCat: {
    fontSize: font.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  rebuildHint: { color: colors.textFaint, fontSize: font.tiny, textAlign: 'center' },
});
