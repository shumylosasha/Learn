import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Button, Card, Pill, SectionTitle } from '@/components/ui';
import { colors, font, radius, spacing } from '@/theme';
import { TOPIC_GROUPS, randomTopic } from '@/lib/topics';
import {
  cancelRecording,
  ensureMicPermission,
  formatDuration,
  getInputLevel,
  startRecording,
  stopRecording,
} from '@/lib/audio';
import { generateTopic } from '@/api/openai';
import { useSettings } from '@/store/settings';
import { useSessions } from '@/store/sessions';
import { processSession } from '@/lib/pipeline';
import { computeStreak } from '@/lib/streak';

function tap() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

export default function SpeakScreen() {
  const router = useRouter();
  const apiKey = useSettings((s) => s.apiKey);
  const prefs = useSettings((s) => s.prefs);
  const createSession = useSessions((s) => s.createSession);
  const sessions = useSessions((s) => s.sessions);
  const streak = computeStreak(sessions);

  const [topic, setTopic] = useState(randomTopic());
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
      cancelRecording();
    };
  }, []);

  const onShuffle = () => {
    tap();
    setTopic(randomTopic());
  };

  const onSuggest = async () => {
    if (!apiKey) {
      promptForKey();
      return;
    }
    setSuggesting(true);
    try {
      const t = await generateTopic(apiKey, prefs.analysisModel);
      if (t) setTopic(t);
    } catch (e) {
      Alert.alert('Could not suggest a topic', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSuggesting(false);
    }
  };

  const promptForKey = () => {
    Alert.alert(
      'Add your OpenAI key',
      'Go to Settings and paste your OpenAI API key to enable recording analysis.',
      [{ text: 'OK' }],
    );
  };

  const onStart = async () => {
    const granted = await ensureMicPermission();
    if (!granted) {
      Alert.alert('Microphone needed', 'Please allow microphone access to record.');
      return;
    }
    try {
      await startRecording();
      tap();
      setRecording(true);
      startedAt.current = Date.now();
      setElapsed(0);
      timer.current = setInterval(() => setElapsed(Date.now() - startedAt.current), 200);
    } catch (e) {
      Alert.alert('Recording failed', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const onStop = async () => {
    if (timer.current) clearInterval(timer.current);
    setRecording(false);
    const result = await stopRecording();
    tap();
    if (!result) {
      Alert.alert('No audio captured', 'Please try recording again.');
      return;
    }
    const session = createSession({
      topic,
      audioUri: result.uri,
      durationMs: result.durationMs,
    });
    // Fire the pipeline; the detail screen reflects live status from the store.
    processSession(session.id);
    router.push(`/session/${session.id}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!apiKey && (
        <Pressable onPress={() => router.push('/settings')}>
          <View style={styles.warn}>
            <Ionicons name="key-outline" size={16} color={colors.warning} />
            <Text style={styles.warnText}>Add your OpenAI API key in Settings to begin.</Text>
          </View>
        </Pressable>
      )}

      {streak.current > 0 && (
        <View style={styles.streakChip}>
          <Text style={styles.streakChipText}>🔥 {streak.current}-day streak</Text>
          {!streak.activeToday && (
            <Text style={styles.streakChipSub}>· record today to keep it</Text>
          )}
        </View>
      )}

      <SectionTitle>Your speaking topic</SectionTitle>
      <Card style={{ gap: spacing.md }}>
        <Text style={styles.topicText}>{topic}</Text>
        <View style={styles.topicActions}>
          <ToolButton icon="create-outline" label="Write own" onPress={() => setCustomOpen(true)} />
          <ToolButton icon="shuffle" label="Shuffle" onPress={onShuffle} />
          <ToolButton
            icon="sparkles"
            label={suggesting ? 'Thinking…' : 'AI suggest'}
            onPress={onSuggest}
            disabled={suggesting}
          />
          <ToolButton icon="list" label="Browse" onPress={() => setPickerOpen(true)} />
        </View>
      </Card>

      <View style={styles.recordZone}>
        <View style={styles.waveWrap}>
          {recording ? (
            <Waveform />
          ) : (
            <Ionicons name="mic-outline" size={28} color={colors.textFaint} />
          )}
        </View>

        <Text style={styles.recordHint}>
          {recording ? formatDuration(elapsed) : 'Ready when you are'}
        </Text>

        <Pressable
          onPress={recording ? onStop : onStart}
          style={({ pressed }) => [
            styles.recordButton,
            {
              backgroundColor: recording ? colors.danger : colors.accent,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            },
          ]}
        >
          <Ionicons name={recording ? 'stop' : 'mic'} size={44} color={colors.accentText} />
        </Pressable>

        <Text style={styles.recordSub}>
          {recording
            ? 'Speak naturally about the topic, then tap to stop.'
            : 'Aim for 30–120 seconds. The AI analyses your grammar and word choice.'}
        </Text>
      </View>

      <CustomTopicModal
        open={customOpen}
        initial={topic}
        onClose={() => setCustomOpen(false)}
        onSave={(t) => {
          setTopic(t);
          setCustomOpen(false);
        }}
      />

      <TopicPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(t) => {
          setTopic(t);
          setPickerOpen(false);
        }}
      />
    </ScrollView>
  );
}

const WAVE_BARS = 28;

/** A live audio-level waveform: bars scroll right-to-left, heights track the mic. */
function Waveform() {
  const [levels, setLevels] = useState<number[]>(() => new Array(WAVE_BARS).fill(0));

  useEffect(() => {
    const id = setInterval(() => {
      const level = getInputLevel();
      setLevels((prev) => [...prev.slice(1), level]);
    }, 90);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.wave}>
      {levels.map((level, i) => {
        // Emphasise the upper range so normal speech reads clearly; keep a
        // minimum so silent bars still show a tidy baseline.
        const height = 4 + Math.pow(level, 0.7) * 44;
        return (
          <View
            key={i}
            style={[
              styles.waveBar,
              { height, opacity: 0.35 + level * 0.65 },
            ]}
          />
        );
      })}
    </View>
  );
}

function ToolButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.toolButton,
        { opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={icon} size={16} color={colors.text} />
      <Text style={styles.toolLabel}>{label}</Text>
    </Pressable>
  );
}

function CustomTopicModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: string;
  onClose: () => void;
  onSave: (topic: string) => void;
}) {
  const [text, setText] = useState(initial);

  // Reset the field to the current topic each time the sheet opens.
  useEffect(() => {
    if (open) setText(initial);
  }, [open, initial]);

  const trimmed = text.trim();

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Your own topic</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
          <Text style={styles.customHelp}>
            Talk about anything from your work — a deal you're closing, a standup update, pitching
            your product, a tricky email you need to say out loud. The AI uses this as context.
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="e.g. Walk through this week's progress to my manager"
            placeholderTextColor={colors.textFaint}
            multiline
            autoFocus
            style={styles.customInput}
          />
          <Button
            title="Use this topic"
            onPress={() => onSave(trimmed)}
            disabled={trimmed.length === 0}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function TopicPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (topic: string) => void;
}) {
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose a topic</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
            {TOPIC_GROUPS.map((group) => (
              <View key={group.label} style={{ marginBottom: spacing.lg }}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                {group.topics.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => onPick(t)}
                    style={({ pressed }) => [
                      styles.topicRow,
                      { backgroundColor: pressed ? colors.surfaceAlt : colors.surface },
                    ]}
                  >
                    <Text style={styles.topicRowText}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
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
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  streakChipText: { color: colors.accent, fontSize: font.small, fontWeight: '800' },
  streakChipSub: { color: colors.textMuted, fontSize: font.tiny },
  topicText: { color: colors.text, fontSize: font.h3, lineHeight: 26, fontWeight: '600' },
  topicActions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  toolLabel: { color: colors.text, fontSize: font.small, fontWeight: '600' },
  recordZone: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.lg },
  waveWrap: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wave: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    gap: 3,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  recordButton: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  recordHint: { color: colors.text, fontSize: font.h2, fontWeight: '800' },
  recordSub: {
    color: colors.textMuted,
    fontSize: font.small,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '82%',
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: { color: colors.text, fontSize: font.h2, fontWeight: '800' },
  customHelp: {
    color: colors.textMuted,
    fontSize: font.small,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  customInput: {
    color: colors.text,
    fontSize: font.body,
    lineHeight: 24,
    minHeight: 96,
    textAlignVertical: 'top',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  groupLabel: {
    color: colors.textMuted,
    fontSize: font.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  topicRow: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  topicRowText: { color: colors.text, fontSize: font.body, lineHeight: 22 },
});
