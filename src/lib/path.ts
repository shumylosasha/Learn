import { generateLearningPath } from '@/api/openai';
import { useSettings } from '@/store/settings';
import { useSessions } from '@/store/sessions';
import { usePath } from '@/store/path';
import { aggregateRecurringMistakes, recurringMistakesContext } from '@/lib/mistakes';

const MAX_NEW_PER_BATCH = 5;

/**
 * After a recording is analysed: add a node for that recording, then generate
 * fresh topic lessons from the learner's cumulative mistakes. Best-effort — a
 * failure still leaves the recording node in place.
 */
export async function extendPathAfterRecording(sessionId: string): Promise<void> {
  const session = useSessions.getState().getSession(sessionId);
  if (!session) return;

  // Load any stored path first so we append rather than overwrite it.
  if (!usePath.getState().loaded) await usePath.getState().load();
  usePath.getState().addRecording(session.id, session.topic, session.createdAt);

  const { apiKey, prefs } = useSettings.getState();
  if (!apiKey) return;
  try {
    const recurring = aggregateRecurringMistakes(useSessions.getState().sessions);
    if (recurring.length === 0) return;
    const specs = await generateLearningPath(
      apiKey,
      prefs.analysisModel,
      recurringMistakesContext(recurring, 12),
    );
    usePath.getState().addTopics(specs.slice(0, MAX_NEW_PER_BATCH), Date.now());
  } catch {
    /* recording node stays; topics can be generated later via "Create more". */
  }
}

/** Manually generate more topic lessons from cumulative mistakes. Returns #added. */
export async function generateMoreTopics(): Promise<number> {
  const { apiKey, prefs } = useSettings.getState();
  if (!apiKey) throw new Error('Add your OpenAI key in Settings first.');
  if (!usePath.getState().loaded) await usePath.getState().load();
  const recurring = aggregateRecurringMistakes(useSessions.getState().sessions);
  if (recurring.length === 0) return 0;
  const specs = await generateLearningPath(
    apiKey,
    prefs.analysisModel,
    recurringMistakesContext(recurring, 12),
  );
  return usePath.getState().addTopics(specs.slice(0, MAX_NEW_PER_BATCH), Date.now());
}
