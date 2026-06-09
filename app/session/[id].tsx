import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Audio } from 'expo-av';
import { Button, Card, Empty, Pill, SectionTitle } from '@/components/ui';
import { categoryColor, colors, font, radius, severityColor, spacing } from '@/theme';
import { useSessions } from '@/store/sessions';
import { processSession } from '@/lib/pipeline';
import { formatDuration, playUri } from '@/lib/audio';
import type { Exercise, LessonStep, Mistake } from '@/types';

const STATUS_LABEL: Record<string, string> = {
  transcribing: 'Transcribing your audio…',
  analyzing: 'Analysing your English…',
};

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useSessions((s) => s.sessions.find((x) => x.id === id));

  if (!session) {
    return <Empty title="Session not found" subtitle="It may have been deleted." />;
  }

  const busy = session.status === 'transcribing' || session.status === 'analyzing';
  const analysis = session.analysis;

  return (
    <>
      <Stack.Screen options={{ title: 'Feedback' }} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.metaRow}>
          <Text style={styles.date}>
            {new Date(session.createdAt).toLocaleString('en-GB', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {session.durationMs > 0 && (
            <Pill label={formatDuration(session.durationMs)} color={colors.textMuted} />
          )}
        </View>

        <Card style={{ gap: spacing.sm }}>
          <SectionTitle>Topic</SectionTitle>
          <Text style={styles.topic}>{session.topic}</Text>
          {session.audioUri ? <PlayButton uri={session.audioUri} /> : null}
        </Card>

        {busy && (
          <Card style={styles.statusCard}>
            <ActivityIndicator color={colors.success} />
            <Text style={styles.statusText}>{STATUS_LABEL[session.status]}</Text>
          </Card>
        )}

        {session.status === 'error' && (
          <Card style={[styles.statusCard, { borderColor: colors.danger }]}>
            <Ionicons name="alert-circle" size={20} color={colors.danger} />
            <Text style={[styles.statusText, { color: colors.danger, flex: 1 }]}>
              {session.error ?? 'Something went wrong.'}
            </Text>
            <Button title="Retry" variant="secondary" onPress={() => processSession(session.id)} />
          </Card>
        )}

        {session.transcript ? (
          <View>
            <SectionTitle>What you said</SectionTitle>
            <Card>
              <Text style={styles.transcript}>{session.transcript}</Text>
            </Card>
          </View>
        ) : null}

        {analysis && (
          <>
            <View>
              <SectionTitle>Overall</SectionTitle>
              <Card style={{ gap: spacing.md }}>
                <View style={styles.levelRow}>
                  <Pill label={`Level ${analysis.level}`} color={colors.success} filled />
                  <Pill
                    label={`${analysis.mistakes.length} things to fix`}
                    color={colors.warning}
                  />
                </View>
                <Text style={styles.summary}>{analysis.summary}</Text>
                {analysis.strengths.length > 0 && (
                  <View style={{ gap: 6 }}>
                    {analysis.strengths.map((s, i) => (
                      <View key={i} style={styles.strengthRow}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                        <Text style={styles.strengthText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            </View>

            <View>
              <SectionTitle>Mistakes</SectionTitle>
              <View style={{ gap: spacing.md }}>
                {analysis.mistakes.map((m, i) => (
                  <MistakeCard key={i} mistake={m} />
                ))}
              </View>
            </View>

            <View>
              <SectionTitle>Your learning plan</SectionTitle>
              <View style={{ gap: spacing.md }}>
                {analysis.lessonPlan.map((step, i) => (
                  <LessonCard key={i} step={step} index={i} />
                ))}
              </View>
            </View>

            <Button
              title="Practise these with the tutor"
              onPress={() => router.push(`/practice/${session.id}`)}
              style={{ marginTop: spacing.sm }}
            />
          </>
        )}
      </ScrollView>
    </>
  );
}

function PlayButton({ uri }: { uri: string }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      sound?.unloadAsync();
    };
  }, [sound]);

  const toggle = async () => {
    try {
      if (playing && sound) {
        await sound.stopAsync();
        setPlaying(false);
        return;
      }
      const s = await playUri(uri);
      setSound(s);
      setPlaying(true);
      s.setOnPlaybackStatusUpdate((st) => {
        if (st.isLoaded && st.didJustFinish) setPlaying(false);
      });
    } catch {
      setPlaying(false);
    }
  };

  return (
    <Pressable onPress={toggle} style={styles.playRow}>
      <Ionicons name={playing ? 'pause-circle' : 'play-circle'} size={22} color={colors.success} />
      <Text style={styles.playText}>{playing ? 'Stop' : 'Play your recording'}</Text>
    </Pressable>
  );
}

function MistakeCard({ mistake }: { mistake: Mistake }) {
  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.mistakeHeader}>
        <Pill label={mistake.category} color={categoryColor(mistake.category)} filled />
        <View
          style={[styles.severityDot, { backgroundColor: severityColor(mistake.severity) }]}
        />
        <Text style={styles.mistakeType}>{mistake.type}</Text>
      </View>
      <View style={styles.quoteBlock}>
        <Text style={styles.quoteWrong}>“{mistake.quote}”</Text>
        <View style={styles.arrowRow}>
          <Ionicons name="arrow-down" size={14} color={colors.success} />
        </View>
        <Text style={styles.quoteRight}>“{mistake.correction}”</Text>
      </View>
      <Text style={styles.explanation}>{mistake.explanation}</Text>
    </Card>
  );
}

function LessonCard({ step, index }: { step: LessonStep; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <Card>
      <Pressable style={styles.lessonHeader} onPress={() => setOpen((o) => !o)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.lessonIndex}>STEP {index + 1}</Text>
          <Text style={styles.lessonTitle}>{step.title}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
      </Pressable>
      {open && (
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <Text style={styles.grammar}>{step.grammarExplanation}</Text>
          {step.exercises.map((ex, i) => (
            <ExerciseItem key={i} exercise={ex} number={i + 1} />
          ))}
        </View>
      )}
    </Card>
  );
}

function ExerciseItem({ exercise, number }: { exercise: Exercise; number: number }) {
  const [revealed, setRevealed] = useState(false);
  const kindLabel = exercise.kind.replace('_', ' ');
  return (
    <View style={styles.exercise}>
      <Text style={styles.exerciseKind}>
        {number}. {kindLabel}
      </Text>
      <Text style={styles.exercisePrompt}>{exercise.prompt}</Text>
      {exercise.options?.length ? (
        <View style={{ gap: 4, marginTop: 4 }}>
          {exercise.options.map((o, i) => (
            <Text key={i} style={styles.option}>
              • {o}
            </Text>
          ))}
        </View>
      ) : null}
      <Pressable onPress={() => setRevealed((r) => !r)} style={styles.revealBtn}>
        <Text style={styles.revealText}>{revealed ? 'Hide answer' : 'Show answer'}</Text>
      </Pressable>
      {revealed && (
        <View style={styles.answerBox}>
          <Text style={styles.answerText}>{exercise.answer}</Text>
          {exercise.hint ? <Text style={styles.hintText}>{exercise.hint}</Text> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { color: colors.textMuted, fontSize: font.small },
  topic: { color: colors.text, fontSize: font.body, lineHeight: 24, fontWeight: '600' },
  playRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  playText: { color: colors.success, fontSize: font.small, fontWeight: '600' },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusText: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  transcript: { color: colors.textMuted, fontSize: font.body, lineHeight: 24, fontStyle: 'italic' },
  levelRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  summary: { color: colors.text, fontSize: font.body, lineHeight: 24 },
  strengthRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  strengthText: { color: colors.textMuted, fontSize: font.small, flex: 1, lineHeight: 20 },
  mistakeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  severityDot: { width: 8, height: 8, borderRadius: 4 },
  mistakeType: { color: colors.text, fontSize: font.small, fontWeight: '700', flex: 1 },
  quoteBlock: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  quoteWrong: { color: colors.danger, fontSize: font.body, lineHeight: 22 },
  arrowRow: { alignItems: 'flex-start' },
  quoteRight: { color: colors.success, fontSize: font.body, lineHeight: 22, fontWeight: '600' },
  explanation: { color: colors.textMuted, fontSize: font.small, lineHeight: 21 },
  lessonHeader: { flexDirection: 'row', alignItems: 'center' },
  lessonIndex: {
    color: colors.success,
    fontSize: font.tiny,
    fontWeight: '800',
    letterSpacing: 1,
  },
  lessonTitle: { color: colors.text, fontSize: font.h3, fontWeight: '700', marginTop: 2 },
  grammar: { color: colors.textMuted, fontSize: font.body, lineHeight: 23 },
  exercise: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  exerciseKind: {
    color: colors.textFaint,
    fontSize: font.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exercisePrompt: { color: colors.text, fontSize: font.body, lineHeight: 22 },
  option: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
  revealBtn: { marginTop: spacing.xs },
  revealText: { color: colors.success, fontSize: font.small, fontWeight: '600' },
  answerBox: {
    marginTop: 4,
    borderLeftWidth: 2,
    borderLeftColor: colors.success,
    paddingLeft: spacing.md,
    gap: 2,
  },
  answerText: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  hintText: { color: colors.textFaint, fontSize: font.small, fontStyle: 'italic' },
});
