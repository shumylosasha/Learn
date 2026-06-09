import { generateReviewPlan } from '@/api/openai';
import { useReviews } from '@/store/reviews';
import { useSessions } from '@/store/sessions';
import { useSettings } from '@/store/settings';
import type { Review, Session } from '@/types';
import {
  aggregateRecurringMistakes,
  buildTrends,
  countsSnapshot,
  recurringMistakesContext,
  trendsTable,
} from './mistakes';

const DAY = 24 * 60 * 60 * 1000;

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Analysed sessions recorded since the last review. */
function newSessionsSince(sessions: Session[], since: number): Session[] {
  return sessions.filter((s) => s.analysis && s.createdAt > since);
}

/**
 * A review is due when the cadence has elapsed AND there are new analysed
 * recordings to review. Cadence 0 means manual-only (never auto-due).
 */
export function isReviewDue(): boolean {
  const { prefs } = useSettings.getState();
  if (prefs.reviewCadenceDays <= 0) return false;
  const { lastReviewAt } = useReviews.getState();
  const { sessions } = useSessions.getState();
  const fresh = newSessionsSince(sessions, lastReviewAt);
  if (fresh.length === 0) return false;
  const elapsed = Date.now() - (lastReviewAt || fresh[fresh.length - 1].createdAt);
  return elapsed >= prefs.reviewCadenceDays * DAY;
}

export function canReview(): boolean {
  const { lastReviewAt } = useReviews.getState();
  const { sessions } = useSessions.getState();
  return newSessionsSince(sessions, lastReviewAt).length > 0;
}

/**
 * Generate a cumulative review across recordings made since the last one,
 * tracking improvement vs the previous review. Returns the new review, or null
 * if there is nothing new / no key / already running.
 */
export async function generateReview(): Promise<Review | null> {
  const reviewsStore = useReviews.getState();
  if (reviewsStore.generating) return null;

  const { apiKey, prefs } = useSettings.getState();
  if (!apiKey) return null;

  const { sessions } = useSessions.getState();
  const { lastReviewAt, latest } = reviewsStore;
  const periodSessions = newSessionsSince(sessions, lastReviewAt);
  if (periodSessions.length === 0) return null;

  reviewsStore.setGenerating(true);
  try {
    const thisPeriod = aggregateRecurringMistakes(periodSessions);
    const prevCounts = latest()?.counts ?? {};
    const trends = buildTrends(thisPeriod, prevCounts);

    const plan = await generateReviewPlan(
      apiKey,
      prefs.analysisModel,
      periodSessions.length,
      trendsTable(trends),
      recurringMistakesContext(thisPeriod, 10),
    );

    const periodStart =
      lastReviewAt || periodSessions[periodSessions.length - 1].createdAt;

    const review: Review = {
      id: uid(),
      createdAt: Date.now(),
      periodStart,
      periodEnd: Date.now(),
      sessionCount: periodSessions.length,
      narrative: plan.narrative,
      trends,
      focus: plan.focus,
      lessonPlan: plan.lessonPlan,
      counts: countsSnapshot(periodSessions),
    };

    await reviewsStore.addReview(review);
    return review;
  } finally {
    reviewsStore.setGenerating(false);
  }
}

/** Fire-and-forget auto review on app open when due. */
export async function maybeAutoReview(): Promise<void> {
  if (isReviewDue()) {
    try {
      await generateReview();
    } catch {
      /* surfaced manually on the Progress tab */
    }
  }
}
