import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Empty, Pill, SectionTitle } from '@/components/ui';
import { LessonPlan } from '@/components/LessonPlan';
import { categoryColor, colors, font, radius, spacing, trendColor } from '@/theme';
import { useSessions } from '@/store/sessions';
import { useReviews } from '@/store/reviews';
import { useSettings } from '@/store/settings';
import {
  aggregateRecurringMistakes,
  countByCategory,
  TREND_LABEL,
} from '@/lib/mistakes';
import { canReview, generateReview } from '@/lib/review';
import { formatDuration } from '@/lib/audio';
import type { MistakeTrend, Review, Session } from '@/types';

export default function ProgressScreen() {
  const router = useRouter();
  const sessions = useSessions((s) => s.sessions);
  const deleteSession = useSessions((s) => s.deleteSession);
  const reviews = useReviews((s) => s.reviews);
  const generating = useReviews((s) => s.generating);
  const apiKey = useSettings((s) => s.apiKey);

  const recurring = useMemo(() => aggregateRecurringMistakes(sessions), [sessions]);
  const byCat = countByCategory(recurring);
  const latestReview = reviews[0];

  if (sessions.length === 0) {
    return (
      <Empty
        title="No recordings yet"
        subtitle="Record yourself on the Speak tab. Each day’s recordings build into a weekly review that tracks whether you’re improving."
      />
    );
  }

  const reviewable = canReview();

  const onReviewNow = async () => {
    if (!apiKey) {
      Alert.alert('Add your API key', 'Set your OpenAI key in Settings first.');
      return;
    }
    const r = await generateReview();
    if (!r) Alert.alert('Nothing new to review', 'Record something first, then try again.');
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Delete recording?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSession(id) },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.statsCard}>
        <Stat value={sessions.length} label="Recordings" />
        <Stat value={recurring.reduce((a, r) => a + r.count, 0)} label="Mistakes" />
        <Stat value={reviews.length} label="Reviews" />
      </Card>

      <Pressable
        onPress={() => router.push('/practice/weakspots')}
        style={({ pressed }) => [styles.practiceCta, pressed && { opacity: 0.9 }]}
      >
        <Ionicons name="barbell" size={20} color={colors.accentText} />
        <View style={{ flex: 1 }}>
          <Text style={styles.practiceCtaTitle}>Practise weak spots</Text>
          <Text style={styles.practiceCtaSub}>Chat tutor drills your recurring mistakes</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.accentText} />
      </Pressable>

      <Button
        title={generating ? 'Reviewing your progress…' : 'Review now'}
        onPress={onReviewNow}
        variant="secondary"
        loading={generating}
        disabled={!reviewable && !generating}
      />
      {!reviewable && !generating && (
        <Text style={styles.hintCenter}>
          No new recordings since your last review. Record more on the Speak tab.
        </Text>
      )}

      {latestReview && <LatestReview review={latestReview} onPractise={() => router.push('/practice/weakspots')} />}

      {recurring.length > 0 && (
        <View>
          <SectionTitle>Recurring mistakes (all time)</SectionTitle>
          <View style={styles.catRow}>
            {(['grammar', 'vocabulary', 'register'] as const).map((c) => (
              <Pill key={c} label={`${c} ${byCat[c] ?? 0}`} color={categoryColor(c)} />
            ))}
          </View>
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            {recurring.slice(0, 10).map((r) => (
              <Card key={r.type} style={{ gap: 6 }}>
                <View style={styles.recHeader}>
                  <View style={[styles.catDot, { backgroundColor: categoryColor(r.category) }]} />
                  <Text style={styles.recType}>{r.type}</Text>
                  <Pill label={`${r.count}×`} color={colors.warning} filled />
                </View>
                <Text style={styles.recExample}>
                  <Text style={{ color: colors.danger }}>“{r.lastQuote}”</Text>
                  {'  →  '}
                  <Text style={{ color: colors.success }}>“{r.lastCorrection}”</Text>
                </Text>
              </Card>
            ))}
          </View>
        </View>
      )}

      {reviews.length > 1 && (
        <View>
          <SectionTitle>Past reviews</SectionTitle>
          <View style={{ gap: spacing.sm }}>
            {reviews.slice(1).map((r) => (
              <Card key={r.id} style={styles.pastReview}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pastDate}>
                    {new Date(r.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                  <Text style={styles.pastNarrative} numberOfLines={2}>
                    {r.narrative}
                  </Text>
                </View>
                <Pill label={`${r.sessionCount} rec`} color={colors.textMuted} />
              </Card>
            ))}
          </View>
        </View>
      )}

      <View style={styles.divider} />

      <SessionHistory sessions={sessions} onOpen={(id) => router.push(`/session/${id}`)} onDelete={confirmDelete} />
    </ScrollView>
  );
}

function LatestReview({ review, onPractise }: { review: Review; onPractise: () => void }) {
  const headline = review.trends.filter((t) => t.status === 'resolved' || t.status === 'improved');
  const work = review.trends.filter((t) => t.status === 'worse' || t.status === 'persistent' || t.status === 'new');

  return (
    <View>
      <SectionTitle>Latest review</SectionTitle>
      <Card style={{ gap: spacing.md }}>
        <View style={styles.reviewHead}>
          <Ionicons name="ribbon" size={20} color={colors.success} />
          <Text style={styles.reviewDate}>
            {new Date(review.createdAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
            })}{' '}
            · {review.sessionCount} recordings
          </Text>
        </View>
        <Text style={styles.narrative}>{review.narrative}</Text>

        {headline.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.subhead}>Progress</Text>
            {headline.map((t) => (
              <TrendRow key={t.type} trend={t} />
            ))}
          </View>
        )}
        {work.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.subhead}>Keep working on</Text>
            {work.map((t) => (
              <TrendRow key={t.type} trend={t} />
            ))}
          </View>
        )}
      </Card>

      {review.lessonPlan.length > 0 && (
        <View style={{ marginTop: spacing.md }}>
          <SectionTitle>Your plan</SectionTitle>
          <LessonPlan steps={review.lessonPlan} />
        </View>
      )}

      <Button title="Practise this plan" onPress={onPractise} style={{ marginTop: spacing.md }} />
    </View>
  );
}

function TrendRow({ trend }: { trend: MistakeTrend }) {
  const color = trendColor(trend.status);
  const delta =
    trend.status === 'resolved'
      ? `${trend.countPrevPeriod} → 0`
      : `${trend.countPrevPeriod} → ${trend.countThisPeriod}`;
  return (
    <View style={styles.trendRow}>
      <View style={[styles.trendDot, { backgroundColor: color }]} />
      <Text style={styles.trendType} numberOfLines={1}>
        {trend.type}
      </Text>
      <Text style={[styles.trendLabel, { color }]}>{TREND_LABEL[trend.status]}</Text>
      <Text style={styles.trendDelta}>{delta}</Text>
    </View>
  );
}

function SessionHistory({
  sessions,
  onOpen,
  onDelete,
}: {
  sessions: Session[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  // Group by calendar day so each day reads as one "lesson".
  const groups = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions) {
      const key = new Date(s.createdAt).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [sessions]);

  return (
    <View>
      <SectionTitle>History</SectionTitle>
      <View style={{ gap: spacing.lg }}>
        {groups.map(([day, items]) => (
          <View key={day} style={{ gap: spacing.sm }}>
            <Text style={styles.dayHeader}>{day}</Text>
            {items.map((s) => (
              <Pressable key={s.id} onPress={() => onOpen(s.id)} onLongPress={() => onDelete(s.id)}>
                <Card style={styles.historyCard}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.histTopic} numberOfLines={2}>
                      {s.topic}
                    </Text>
                    <View style={styles.histMeta}>
                      {s.durationMs > 0 && (
                        <Text style={styles.histDate}>{formatDuration(s.durationMs)}</Text>
                      )}
                      <StatusTag status={s.status} count={s.analysis?.mistakes.length} />
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                </Card>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
      <Text style={styles.hintCenter}>Long-press a recording to delete it.</Text>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StatusTag({ status, count }: { status: string; count?: number }) {
  if (status === 'ready' && count != null) {
    return <Pill label={`${count} types`} color={colors.success} />;
  }
  if (status === 'error') return <Pill label="error" color={colors.danger} />;
  if (status === 'transcribing' || status === 'analyzing') {
    return <Pill label="processing…" color={colors.warning} />;
  }
  return <Pill label={status} color={colors.textMuted} />;
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  statsCard: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { color: colors.text, fontSize: font.h1, fontWeight: '800' },
  statLabel: {
    color: colors.textMuted,
    fontSize: font.tiny,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hintCenter: { color: colors.textFaint, fontSize: font.tiny, textAlign: 'center' },
  practiceCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md + 2,
  },
  practiceCtaTitle: { color: colors.accentText, fontSize: font.body, fontWeight: '800' },
  practiceCtaSub: { color: colors.accentText, fontSize: font.tiny, opacity: 0.85, marginTop: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  catRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  recType: { color: colors.text, fontSize: font.body, fontWeight: '700', flex: 1 },
  recExample: { fontSize: font.small, lineHeight: 20 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reviewDate: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },
  narrative: { color: colors.text, fontSize: font.body, lineHeight: 24 },
  subhead: {
    color: colors.textMuted,
    fontSize: font.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  trendDot: { width: 8, height: 8, borderRadius: 4 },
  trendType: { color: colors.text, fontSize: font.small, flex: 1 },
  trendLabel: { fontSize: font.tiny, fontWeight: '700' },
  trendDelta: { color: colors.textFaint, fontSize: font.tiny, minWidth: 56, textAlign: 'right' },
  pastReview: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pastDate: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '700', marginBottom: 2 },
  pastNarrative: { color: colors.textMuted, fontSize: font.small, lineHeight: 19 },
  dayHeader: {
    color: colors.textMuted,
    fontSize: font.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  historyCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  histTopic: { color: colors.text, fontSize: font.body, fontWeight: '600', lineHeight: 21 },
  histMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  histDate: { color: colors.textFaint, fontSize: font.tiny },
});
