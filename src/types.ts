// Core domain types for the Business English Coach app.

export type MistakeCategory = 'grammar' | 'vocabulary' | 'register';

export interface Mistake {
  category: MistakeCategory;
  /**
   * A short, canonical label used to GROUP recurring mistakes across sessions,
   * e.g. "Present perfect vs past simple", "Missing definite article",
   * "Preposition after 'depend'". Keep it stable and reusable.
   */
  type: string;
  /** A representative phrase the learner said that contains the mistake. */
  quote: string;
  /** A corrected, natural British-English version of the quote. */
  correction: string;
  /** Short note on why it is wrong. Kept brief — depth lives in the review. */
  explanation: string;
  /** 1 = minor / stylistic, 2 = noticeable, 3 = changes meaning / clearly wrong. */
  severity: 1 | 2 | 3;
  /** How many times this mistake TYPE occurred in THIS recording. */
  occurrences: number;
}

/**
 * Lightweight per-recording result. We deliberately do NOT generate a lesson
 * plan per recording — recordings can be long and frequent, so each one just
 * captures the mistakes (consolidated by type). Depth lives in the weekly Review.
 */
export interface SessionAnalysis {
  summary: string; // one line
  level: string; // rough CEFR estimate, e.g. "B2"
  mistakes: Mistake[];
}

export type ExerciseKind = 'translate' | 'multiple_choice' | 'rewrite' | 'fill_blank';

export interface Exercise {
  kind: ExerciseKind;
  prompt: string;
  /** Present for multiple_choice. */
  options?: string[];
  answer: string;
  hint?: string;
}

export interface LessonStep {
  title: string;
  /** Links this step back to a Mistake.type so we know what it targets. */
  focusType: string;
  grammarExplanation: string;
  exercises: Exercise[];
}

export type SessionStatus =
  | 'recorded'
  | 'transcribing'
  | 'analyzing'
  | 'ready'
  | 'error';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface Session {
  id: string;
  topic: string;
  createdAt: number;
  audioUri: string | null;
  durationMs: number;
  transcript: string;
  analysis: SessionAnalysis | null;
  status: SessionStatus;
  error?: string;
  /** Practice conversation tied to this session. */
  practice: ChatMessage[];
}

/** Aggregated view of one mistake type across a set of sessions. */
export interface RecurringMistake {
  type: string;
  category: MistakeCategory;
  /** Total occurrences (summed across recordings, not just session count). */
  count: number;
  /** How many distinct recordings it appeared in. */
  sessions: number;
  lastQuote: string;
  lastCorrection: string;
  lastSeenAt: number;
}

export type TrendStatus = 'resolved' | 'improved' | 'persistent' | 'worse' | 'new';

/** Improvement tracking for one mistake type, this period vs the previous one. */
export interface MistakeTrend {
  type: string;
  category: MistakeCategory;
  countThisPeriod: number;
  countPrevPeriod: number;
  status: TrendStatus;
  example: string; // "quote → correction"
}

/**
 * A periodic (weekly) synthesis across many recordings: how the learner is
 * progressing, what to focus on now, and a consolidated lesson plan. This is
 * where the real teaching happens; per-recording output stays lightweight.
 */
export interface Review {
  id: string;
  createdAt: number;
  periodStart: number;
  periodEnd: number;
  sessionCount: number;
  /** Encouraging, specific overview of progress since last time. */
  narrative: string;
  /** Improvement tracking vs the previous review. */
  trends: MistakeTrend[];
  /** Top mistake types to prioritise now. */
  focus: string[];
  /** Consolidated plan targeting the focus areas. */
  lessonPlan: LessonStep[];
  /**
   * Snapshot of {normalisedType: count} for THIS period, so the next review can
   * compute trends without re-reading every session.
   */
  counts: Record<string, number>;
}
