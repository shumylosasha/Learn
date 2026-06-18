import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Empty, Pill, SectionTitle } from '@/components/ui';
import { LessonPlan } from '@/components/LessonPlan';
import { categoryColor, colors, font, spacing, trendColor } from '@/theme';
import { useSessions } from '@/store/sessions';
import { useReviews } from '@/store/reviews';
import { useSettings } from '@/store/settings';
import {
  aggregateRecurringMistakes,
  countByCategory,
  TREND_LABEL,
} from '@/lib/mistakes';
import { canReview, generateReview } from '@/lib/review';
import { computeStreak } from '@/lib/streak';
import type { MistakeTrend, Review } from '@/types';

export default function ProgressScreen() {
  const router = useRouter();
  const sessions = useSessions((s) => s.sessions);
  const reviews = useReviews((s) => s.reviews);
  const generating = useReviews((s) => s.generating);
  const apiKey = useSettings((s) => s.apiKey);

  const recurring = useMemo(() => aggregateRecurringMistakes(sessions), [sessions]);
  const byCat = countByCategory(recurring);
  const latestReview = reviews[0];
  const streak = useMemo(() => computeStreak(sessions), [sessions]);

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StreakCard streak={streak} />

      <Card style={styles.statsCard}>
        <Stat value={sessions.length} label="Recordings" />
        <Stat value={recurring.reduce((a, r) => a + r.count, 0)} label="Mistakes" />
        <Stat value={reviews.length} label="Reviews" />
      </Card>

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

function StreakCard({ streak }: { streak: ReturnType<typeof computeStreak> }) {
  const { current, best, activeToday, last7 } = streak;
  const message =
    current === 0
      ? 'Record today to start a streak.'
      : activeToday
        ? `Practised today — see you tomorrow! Best: ${best} days.`
        : 'Record today to keep your streak alive.';

  return (
    <Card style={styles.streakCard}>
      <View style={styles.streakTop}>
        <View style={styles.streakCount}>
          <Text style={styles.streakFire}>{current > 0 ? '🔥' : '✨'}</Text>
          <Text style={styles.streakNumber}>{current}</Text>
          <Text style={styles.streakUnit}>day{current === 1 ? '' : 's'}</Text>
        </View>
        <View style={styles.dotsRow}>
          {last7.map((d, i) => (
            <View key={i} style={styles.dotCol}>
              <View
                style={[
                  styles.dot,
                  d.active && styles.dotActive,
                  d.isToday && styles.dotToday,
                ]}
              >
                {d.active && <Text style={styles.dotMark}>🔥</Text>}
              </View>
              <Text style={[styles.dotLabel, d.isToday && styles.dotLabelToday]}>{d.label}</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={styles.streakMsg}>{message}</Text>
    </Card>
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

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  streakCard: { gap: spacing.md },
  streakTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  streakCount: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  streakFire: { fontSize: 26 },
  streakNumber: { color: colors.text, fontSize: font.h1, fontWeight: '800' },
  streakUnit: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },
  dotsRow: { flexDirection: 'row', gap: 6 },
  dotCol: { alignItems: 'center', gap: 4 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  dotToday: { borderColor: colors.accent, borderWidth: 2 },
  dotMark: { fontSize: 11 },
  dotLabel: { color: colors.textFaint, fontSize: 10, fontWeight: '700' },
  dotLabelToday: { color: colors.accent },
  streakMsg: { color: colors.textMuted, fontSize: font.small },
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
});
