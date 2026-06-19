import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui';
import { categoryColor, colors, font, radius, spacing } from '@/theme';
import { useSessions } from '@/store/sessions';
import { useSettings } from '@/store/settings';
import { usePath, type PathNode } from '@/store/path';
import { computeStreak } from '@/lib/streak';
import { generateMoreTopics } from '@/lib/path';

export default function PathScreen() {
  const router = useRouter();
  const apiKey = useSettings((s) => s.apiKey);
  const sessions = useSessions((s) => s.sessions);
  const nodes = usePath((s) => s.nodes);
  const loaded = usePath((s) => s.loaded);
  const load = usePath((s) => s.load);

  const [building, setBuilding] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  const streak = computeStreak(sessions);
  const done = nodes.filter((n) => n.status === 'completed').length;
  const firstOpenIndex = nodes.findIndex((n) => n.status !== 'completed');

  const openNode = (node: PathNode) => {
    if (node.kind === 'recording') router.push(`/session/${node.sessionId}`);
    else router.push(`/practice/${node.id}`);
  };

  const createMore = async () => {
    setBuilding(true);
    try {
      const added = await generateMoreTopics();
      if (added === 0) {
        Alert.alert('Nothing new to add', 'Record a bit more, then try again.');
      }
    } catch (e) {
      Alert.alert('Could not add lessons', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBuilding(false);
    }
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

      {(nodes.length > 0 || streak.current > 0) && (
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            {nodes.length > 0 ? `${done} of ${nodes.length} lessons done` : ''}
          </Text>
          {streak.current > 0 && (
            <View style={styles.streakChip}>
              <Text style={styles.streakChipText}>🔥 {streak.current}</Text>
            </View>
          )}
        </View>
      )}

      <Pressable
        onPress={() => router.push('/record')}
        style={({ pressed }) => [styles.recordCta, pressed && { opacity: 0.9 }]}
      >
        <Ionicons name="mic" size={22} color={colors.accentText} />
        <View style={{ flex: 1 }}>
          <Text style={styles.recordTitle}>Record yourself</Text>
          <Text style={styles.recordSub}>
            {nodes.length === 0
              ? 'Speak about anything — I’ll build your lessons from it'
              : 'Add a recording to grow your path'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.accentText} />
      </Pressable>

      {loaded && nodes.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Your journey starts with a recording</Text>
          <Text style={styles.emptyText}>
            Record yourself speaking. I’ll find your mistakes and turn them into a path of short
            lessons — fix that recording, then work through bigger topics like articles or tenses.
          </Text>
        </View>
      ) : (
        <View>
          {nodes.map((node, i) => (
            <NodeRow
              key={node.id}
              node={node}
              index={i}
              isLast={i === nodes.length - 1}
              isNext={i === firstOpenIndex}
              onPress={() => openNode(node)}
            />
          ))}
        </View>
      )}

      {nodes.length > 0 && (
        <Pressable
          onPress={createMore}
          disabled={building}
          style={({ pressed }) => [styles.moreBtn, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="sparkles" size={16} color={colors.accent} />
          <Text style={styles.moreText}>
            {building ? 'Creating lessons…' : 'Create more lessons'}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function NodeRow({
  node,
  index,
  isLast,
  isNext,
  onPress,
}: {
  node: PathNode;
  index: number;
  isLast: boolean;
  isNext: boolean;
  onPress: () => void;
}) {
  const done = node.status === 'completed';
  const isRecording = node.kind === 'recording';
  const accent = isRecording ? colors.accent : categoryColor(node.category);
  const circleColor = done ? colors.success : accent;

  return (
    <View style={styles.nodeRow}>
      <View style={styles.rail}>
        <View style={[styles.circle, { backgroundColor: circleColor }, isNext && styles.circleNext]}>
          {done ? (
            <Ionicons name="checkmark" size={18} color={colors.accentText} />
          ) : isRecording ? (
            <Ionicons name="mic" size={16} color={colors.accentText} />
          ) : (
            <Text style={styles.circleNum}>{index + 1}</Text>
          )}
        </View>
        {!isLast && <View style={styles.connector} />}
      </View>

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.nodeCard,
          isNext && styles.nodeCardNext,
          pressed && { opacity: 0.85 },
        ]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.nodeTitle, done && styles.nodeTitleDone]} numberOfLines={2}>
            {node.title}
          </Text>
          <Text style={styles.nodeSummary} numberOfLines={2}>
            {node.summary}
          </Text>
          <Text style={[styles.nodeTag, { color: isRecording ? colors.accent : accent }]}>
            {isRecording ? 'recording · view & practise' : node.category}
            {done ? ' · done' : isNext ? ' · next up' : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
      </Pressable>
    </View>
  );
}

const RAIL = 40;
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  subtitle: { color: colors.textMuted, fontSize: font.small, flex: 1 },
  streakChip: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  streakChipText: { color: colors.accent, fontSize: font.body, fontWeight: '800' },
  recordCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md + 2,
  },
  recordTitle: { color: colors.accentText, fontSize: font.body, fontWeight: '800' },
  recordSub: { color: colors.accentText, fontSize: font.tiny, opacity: 0.85, marginTop: 1 },
  emptyWrap: { paddingVertical: spacing.xl, gap: spacing.sm },
  emptyTitle: { color: colors.text, fontSize: font.h3, fontWeight: '700', textAlign: 'center' },
  emptyText: {
    color: colors.textMuted,
    fontSize: font.small,
    lineHeight: 21,
    textAlign: 'center',
  },
  nodeRow: { flexDirection: 'row', gap: spacing.md },
  rail: { width: RAIL, alignItems: 'center' },
  circle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  circleNext: { borderWidth: 3, borderColor: colors.accentSoft },
  circleNum: { color: colors.accentText, fontSize: font.small, fontWeight: '800' },
  connector: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 2 },
  nodeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  nodeCardNext: { borderColor: colors.accent },
  nodeTitle: { color: colors.text, fontSize: font.body, fontWeight: '700', lineHeight: 21 },
  nodeTitleDone: { color: colors.textMuted },
  nodeSummary: { color: colors.textMuted, fontSize: font.small, lineHeight: 19 },
  nodeTag: {
    fontSize: font.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  moreText: { color: colors.accent, fontSize: font.small, fontWeight: '700' },
});
