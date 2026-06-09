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
  /** The exact phrase the learner said that contains the mistake. */
  quote: string;
  /** A corrected, natural British-English version of the quote. */
  correction: string;
  /** Why it is wrong and how to think about it. */
  explanation: string;
  /** 1 = minor / stylistic, 2 = noticeable, 3 = changes meaning / clearly wrong. */
  severity: 1 | 2 | 3;
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

export interface Analysis {
  summary: string;
  /** Rough CEFR estimate, e.g. "B2". */
  level: string;
  strengths: string[];
  mistakes: Mistake[];
  lessonPlan: LessonStep[];
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
  analysis: Analysis | null;
  status: SessionStatus;
  error?: string;
  /** Practice conversation tied to this session. */
  practice: ChatMessage[];
}

/** Aggregated view of a recurring mistake across all sessions. */
export interface RecurringMistake {
  type: string;
  category: MistakeCategory;
  count: number;
  /** Most recent example quote/correction for quick recall. */
  lastQuote: string;
  lastCorrection: string;
  lastSeenAt: number;
}
