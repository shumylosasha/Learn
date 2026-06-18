import type { Session } from '@/types';

// A "day" is a local calendar day; one or more recordings that day = active.
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export interface DayDot {
  label: string; // single-letter weekday
  active: boolean;
  isToday: boolean;
}

export interface StreakInfo {
  current: number;
  best: number;
  activeToday: boolean;
  /** The last 7 days, oldest → today, for a dot row. */
  last7: DayDot[];
}

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function computeStreak(sessions: Session[]): StreakInfo {
  const days = new Set(sessions.map((s) => dayKey(new Date(s.createdAt))));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeToday = days.has(dayKey(today));

  // Count back from today (or yesterday, as a grace day) while days are active.
  let current = 0;
  const cursor = new Date(today);
  if (!activeToday) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Longest run across all active days.
  let best = 0;
  if (days.size > 0) {
    const sorted = Array.from(days)
      .map((k) => k.split('-').map(Number))
      .map(([y, m, d]) => new Date(y, m, d).getTime())
      .sort((a, b) => a - b);
    let run = 1;
    best = 1;
    const DAY = 86400000;
    for (let i = 1; i < sorted.length; i++) {
      const gap = Math.round((sorted[i] - sorted[i - 1]) / DAY);
      run = gap === 1 ? run + 1 : 1;
      if (run > best) best = run;
    }
  }
  best = Math.max(best, current);

  const last7: DayDot[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last7.push({ label: WEEKDAY[d.getDay()], active: days.has(dayKey(d)), isToday: i === 0 });
  }

  return { current, best, activeToday, last7 };
}
