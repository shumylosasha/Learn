import { analyzeSpeaking, transcribeAudio } from '@/api/openai';
import { useSessions } from '@/store/sessions';
import { useSettings } from '@/store/settings';

/**
 * Run the full transcribe → analyse pipeline for a session, updating its status
 * in the store as it goes. Safe to await; surfaces errors onto the session.
 */
export async function processSession(sessionId: string): Promise<void> {
  const { apiKey, prefs } = useSettings.getState();
  const store = useSessions.getState();
  const session = store.getSession(sessionId);

  if (!session) return;
  if (!apiKey) {
    store.updateSession(sessionId, {
      status: 'error',
      error: 'No OpenAI API key set. Add one in Settings.',
    });
    return;
  }
  if (!session.audioUri) {
    store.updateSession(sessionId, { status: 'error', error: 'No audio to process.' });
    return;
  }

  try {
    store.updateSession(sessionId, { status: 'transcribing', error: undefined });
    const transcript = await transcribeAudio(
      apiKey,
      session.audioUri,
      prefs.transcriptionModel,
      session.durationMs,
    );

    if (!transcript) {
      store.updateSession(sessionId, {
        status: 'error',
        error: 'Could not hear any speech. Try recording again.',
      });
      return;
    }

    store.updateSession(sessionId, { transcript, status: 'analyzing' });
    const analysis = await analyzeSpeaking(
      apiKey,
      session.topic,
      transcript,
      prefs.analysisModel,
    );

    store.setAnalysis(sessionId, analysis);
  } catch (err) {
    store.updateSession(sessionId, {
      status: 'error',
      error: err instanceof Error ? err.message : 'Something went wrong.',
    });
  }
}
