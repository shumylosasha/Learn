import type { RecurringMistake, Session } from '@/types';

/** Normalise a mistake "type" label so near-duplicates group together. */
function normalizeType(type: string): string {
  return type.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Aggregate every mistake across all analysed sessions into a ranked list of
 * recurring problems. Most frequent first; ties broken by most recent.
 */
export function aggregateRecurringMistakes(sessions: Session[]): RecurringMistake[] {
  const map = new Map<string, RecurringMistake>();

  for (const session of sessions) {
    if (!session.analysis) continue;
    for (const m of session.analysis.mistakes) {
      const key = normalizeType(m.type);
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
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
          count: 1,
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
        `${i + 1}. [${r.category}] "${r.type}" — seen ${r.count}× (e.g. "${r.lastQuote}" → "${r.lastCorrection}")`,
    )
    .join('\n');
}

export function countByCategory(recurring: RecurringMistake[]) {
  const counts = { grammar: 0, vocabulary: 0, register: 0 } as Record<string, number>;
  for (const r of recurring) counts[r.category] = (counts[r.category] ?? 0) + r.count;
  return counts;
}
