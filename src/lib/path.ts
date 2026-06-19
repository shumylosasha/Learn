import { generateLearningPath } from '@/api/openai';
import { useSettings } from '@/store/settings';
import { useSessions } from '@/store/sessions';
import { usePath } from '@/store/path';
import type { Mistake } from '@/types';

const MAX_LESSONS_PER_RECORDING = 5;

// Guards against the pipeline auto-gen and a manual retry running at once.
const inFlight = new Set<string>();

function mistakesContext(mistakes: Mistake[]): string {
  return mistakes
    .map(
      (m, i) =>
        `${i + 1}. [${m.category}] ${m.type} (x${m.occurrences}) — said "${m.quote}" → "${m.correction}". ${m.explanation}`,
    )
    .join('\n');
}

/**
 * Generate a small set of lessons FROM one recording's mistakes and add them to
 * the path. Returns the number added (0 if no mistakes / already generated).
 * Throws on API failure so callers can offer a retry.
 */
export async function generateLessonsForSession(sessionId: string): Promise<number> {
  const session = useSessions.getState().getSession(sessionId);
  if (!session?.analysis || session.analysis.mistakes.length === 0) return 0;

  // Load any stored path first so we append rather than overwrite it.
  if (!usePath.getState().loaded) await usePath.getState().load();
  if (usePath.getState().lessons.some((l) => l.sessionId === sessionId)) return 0;
  if (inFlight.has(sessionId)) return 0;

  const { apiKey, prefs } = useSettings.getState();
  if (!apiKey) throw new Error('Add your OpenAI key in Settings first.');

  inFlight.add(sessionId);
  try {
    const specs = await generateLearningPath(
      apiKey,
      prefs.smartModel,
      mistakesContext(session.analysis.mistakes),
    );
    usePath.getState().addForRecording(
      sessionId,
      specs.slice(0, MAX_LESSONS_PER_RECORDING),
      session.createdAt,
    );
    return Math.min(specs.length, MAX_LESSONS_PER_RECORDING);
  } finally {
    inFlight.delete(sessionId);
  }
}

/** Best-effort generation right after a recording is analysed (errors ignored). */
export async function extendPathAfterRecording(sessionId: string): Promise<void> {
  try {
    await generateLessonsForSession(sessionId);
  } catch {
    /* the user can retry from the recording screen */
  }
}
