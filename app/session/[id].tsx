import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { AudioPlayer } from 'expo-audio';
import { Button, Card, Empty, Pill, SectionTitle } from '@/components/ui';
import { categoryColor, colors, font, radius, severityColor, spacing } from '@/theme';
import { useSessions } from '@/store/sessions';
import { usePath } from '@/store/path';
import { generateLessonsForSession } from '@/lib/path';
import { processSession } from '@/lib/pipeline';
import { formatDuration, playUri } from '@/lib/audio';
import type { Mistake } from '@/types';

const STATUS_LABEL: Record<string, string> = {
  transcribing: 'Transcribing your audio…',
  analyzing: 'Capturing your mistakes…',
};

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useSessions((s) => s.sessions.find((x) => x.id === id));
  const allLessons = usePath((s) => s.lessons);
  const loadPath = usePath((s) => s.load);
  const lessons = useMemo(() => allLessons.filter((l) => l.sessionId === id), [allLessons, id]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [genLoading, setGenLoading] = useState(false);

  useEffect(() => {
    loadPath();
  }, [loadPath]);

  const createLessons = async () => {
    if (!id) return;
    setGenLoading(true);
    try {
      await generateLessonsForSession(id);
    } catch (e) {
      Alert.alert('Could not create lessons', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setGenLoading(false);
    }
  };

  if (!session) {
    return <Empty title="Session not found" subtitle="It may have been deleted." />;
  }

  const busy = session.status === 'transcribing' || session.status === 'analyzing';
  const analysis = session.analysis;
  const totalOcc = analysis
    ? analysis.mistakes.reduce((a, m) => a + (m.occurrences || 1), 0)
    : 0;

  return (
    <>
      <Stack.Screen options={{ title: 'Recording' }} />
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

        {analysis && (
          <>
            {analysis.mistakes.length > 0 &&
              (() => {
                const nextLesson = lessons.find((l) => l.status !== 'completed') ?? lessons[0];
                if (!nextLesson) {
                  return genLoading ? (
                    <Card style={styles.startCard}>
                      <ActivityIndicator color={colors.accent} />
                      <Text style={styles.startPrep}>Preparing your lessons from these mistakes…</Text>
                    </Card>
                  ) : (
                    <Button title="Create lessons from these mistakes" onPress={createLessons} />
                  );
                }
                const allDone = lessons.every((l) => l.status === 'completed');
                return (
                  <Button
                    title={allDone ? 'Practise again' : '▶  Start lesson'}
                    onPress={() => router.push(`/practice/${nextLesson.id}`)}
                  />
                );
              })()}

            {analysis.mistakes.length > 0 && (
              <View>
                <SectionTitle>Mistakes captured</SectionTitle>
                <View style={{ gap: spacing.md }}>
                  {analysis.mistakes.map((m, i) => (
                    <MistakeCard key={i} mistake={m} />
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {session.transcript ? (
          <View>
            <Pressable onPress={() => setShowTranscript((v) => !v)} style={styles.transToggle}>
              <Text style={styles.transToggleText}>
                {showTranscript ? 'Hide transcript' : 'Show transcript'}
              </Text>
              <Ionicons
                name={showTranscript ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textMuted}
              />
            </Pressable>
            {showTranscript && (
              <Card>
                <Text style={styles.transcript}>{session.transcript}</Text>
              </Card>
            )}
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

function PlayButton({ uri }: { uri: string }) {
  const [sound, setSound] = useState<AudioPlayer | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      sound?.remove();
    };
  }, [sound]);

  const toggle = async () => {
    try {
      if (playing && sound) {
        sound.pause();
        setPlaying(false);
        return;
      }
      const s = await playUri(uri);
      setSound(s);
      setPlaying(true);
      s.addListener('playbackStatusUpdate', (st) => {
        if (st.didJustFinish) setPlaying(false);
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
        <View style={[styles.severityDot, { backgroundColor: severityColor(mistake.severity) }]} />
        <Text style={styles.mistakeType}>{mistake.type}</Text>
        {mistake.occurrences > 1 && (
          <Pill label={`${mistake.occurrences}×`} color={colors.warning} />
        )}
      </View>
      <View style={styles.quoteBlock}>
        <Text style={styles.quoteWrong}>“{mistake.quote}”</Text>
        <Ionicons name="arrow-down" size={14} color={colors.success} />
        <Text style={styles.quoteRight}>“{mistake.correction}”</Text>
      </View>
      <Text style={styles.explanation}>{mistake.explanation}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { color: colors.textMuted, fontSize: font.small },
  topic: { color: colors.text, fontSize: font.body, lineHeight: 24, fontWeight: '600' },
  startCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  startPrep: { color: colors.textMuted, fontSize: font.small, flex: 1 },
  playRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  playText: { color: colors.success, fontSize: font.small, fontWeight: '600' },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statusText: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  levelRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  summary: { color: colors.text, fontSize: font.body, lineHeight: 24 },
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
  quoteRight: { color: colors.success, fontSize: font.body, lineHeight: 22, fontWeight: '600' },
  explanation: { color: colors.textMuted, fontSize: font.small, lineHeight: 21 },
  noteCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  noteText: { color: colors.textMuted, fontSize: font.small, lineHeight: 20, flex: 1 },
  transToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  transToggleText: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },
  transcript: { color: colors.textMuted, fontSize: font.body, lineHeight: 24, fontStyle: 'italic' },
});
