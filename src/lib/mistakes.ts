import type {
  MistakeCategory,
  MistakeTrend,
  RecurringMistake,
  Session,
  TrendStatus,
} from '@/types';

/** Normalise a mistake "type" label so near-duplicates group together. */
export function normalizeType(type: string): string {
  return type.trim().toLowerCase().replace(/\s+/g, ' ');
}

function occ(n: number | undefined): number {
  return n && n > 0 ? n : 1;
}

/**
 * Aggregate every mistake across the given sessions into a ranked list. "count"
 * sums OCCURRENCES (so a 35-min talk that repeats an error 12× counts as 12),
 * which is what makes the cumulative picture meaningful.
 */
export function aggregateRecurringMistakes(sessions: Session[]): RecurringMistake[] {
  const map = new Map<string, RecurringMistake>();

  for (const session of sessions) {
    if (!session.analysis) continue;
    for (const m of session.analysis.mistakes) {
      const key = normalizeType(m.type);
      const existing = map.get(key);
      if (existing) {
        existing.count += occ(m.occurrences);
        existing.sessions += 1;
        if (session.createdAt >= existing.lastSeenAt) {
          existing.lastSeenAt = session.createdAt;
          existing.lastQuote = m.quote;
          existing.lastCorrection = m.correction;
          existing.category = m.category;
        }
      } else {
        map.set(key, {
          type: m.type,
          category: m.category,
          count: occ(m.occurrences),
          sessions: 1,
          lastQuote: m.quote,
          lastCorrection: m.correction,
          lastSeenAt: session.createdAt,
        });
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.count - a.count || b.lastSeenAt - a.lastSeenAt,
  );
}

/** A compact summary of weak spots to feed into prompts as context. */
export function recurringMistakesContext(recurring: RecurringMistake[], limit = 8): string {
  if (recurring.length === 0) return 'No recurring mistakes recorded yet.';
  return recurring
    .slice(0, limit)
    .map(
      (r, i) =>
        `${i + 1}. [${r.category}] "${r.type}" — ${r.count}× across ${r.sessions} recording(s) (e.g. "${r.lastQuote}" → "${r.lastCorrection}")`,
    )
    .join('\n');
}

export function countByCategory(recurring: RecurringMistake[]) {
  const counts: Record<string, number> = { grammar: 0, vocabulary: 0, register: 0 };
  for (const r of recurring) counts[r.category] = (counts[r.category] ?? 0) + r.count;
  return counts;
}

/** {normalisedType: total occurrences} for a set of sessions — a review snapshot. */
export function countsSnapshot(sessions: Session[]): Record<string, number> {
  const snap: Record<string, number> = {};
  for (const r of aggregateRecurringMistakes(sessions)) {
    snap[normalizeType(r.type)] = r.count;
  }
  return snap;
}

function classify(now: number, prev: number): TrendStatus {
  if (prev === 0 && now > 0) return 'new';
  if (now === 0 && prev > 0) return 'resolved';
  if (now < prev) return 'improved';
  if (now > prev) return 'worse';
  return 'persistent';
}

/**
 * Build improvement trends for this period vs the previous review's snapshot.
 * Includes resolved types (present before, gone now) so progress is visible.
 */
export function buildTrends(
  thisPeriod: RecurringMistake[],
  prevCounts: Record<string, number>,
): MistakeTrend[] {
  const trends: MistakeTrend[] = [];
  const seen = new Set<string>();

  for (const r of thisPeriod) {
    const key = normalizeType(r.type);
    seen.add(key);
    const prev = prevCounts[key] ?? 0;
    trends.push({
      type: r.type,
      category: r.category,
      countThisPeriod: r.count,
      countPrevPeriod: prev,
      status: classify(r.count, prev),
      example: `"${r.lastQuote}" → "${r.lastCorrection}"`,
    });
  }

  // Resolved types: in the previous snapshot but absent now.
  for (const [key, prev] of Object.entries(prevCounts)) {
    if (seen.has(key) || prev === 0) continue;
    trends.push({
      type: key,
      category: 'grammar',
      countThisPeriod: 0,
      countPrevPeriod: prev,
      status: 'resolved',
      example: '',
    });
  }

  const order: Record<TrendStatus, number> = {
    worse: 0,
    persistent: 1,
    new: 2,
    improved: 3,
    resolved: 4,
  };
  return trends.sort(
    (a, b) => order[a.status] - order[b.status] || b.countThisPeriod - a.countThisPeriod,
  );
}

export function trendsTable(trends: MistakeTrend[]): string {
  if (trends.length === 0) return 'No mistakes recorded this period.';
  return trends
    .map(
      (t) =>
        `- [${t.status}] "${t.type}" (${t.category}): now ${t.countThisPeriod}, was ${t.countPrevPeriod}${t.example ? ` — ${t.example}` : ''}`,
    )
    .join('\n');
}

export const TREND_LABEL: Record<TrendStatus, string> = {
  resolved: 'Resolved',
  improved: 'Improving',
  persistent: 'Still here',
  worse: 'Getting worse',
  new: 'New',
};
