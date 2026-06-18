import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { useUsage } from '@/store/usage';
import type { LessonStep, SessionAnalysis } from '@/types';

function recordChatUsage(model: string, usage: unknown) {
  const u = usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
  if (!u) return;
  useUsage.getState().recordChat(model, u.prompt_tokens ?? 0, u.completion_tokens ?? 0);
}
import {
  ANALYSIS_SCHEMA,
  ANALYSIS_SYSTEM_PROMPT,
  buildAnalysisUserMessage,
  buildLearningPathUserMessage,
  buildReviewUserMessage,
  LEARNING_PATH_SCHEMA,
  LEARNING_PATH_SYSTEM_PROMPT,
  REVIEW_SCHEMA,
  REVIEW_SYSTEM_PROMPT,
  TOPIC_GENERATION_PROMPT,
} from './prompts';

const BASE = 'https://api.openai.com/v1';

export class OpenAIError extends Error {}

function authHeaders(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}` };
}

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.error?.message ?? JSON.stringify(data);
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

export interface ChatMessageInput {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Transcribe a recorded audio file (m4a) using a Whisper / gpt-4o transcribe model. */
export async function transcribeAudio(
  apiKey: string,
  audioUri: string,
  model: string,
  durationMs = 0,
): Promise<string> {
  // Record usage by audio length (transcription is billed per minute).
  if (durationMs > 0) useUsage.getState().recordTranscription(model, durationMs / 1000);
  // On native, RN's own FormData multipart encoder rejects file-URI parts under
  // the new architecture ("Unsupported FormData part implementation"). Expo's
  // native uploader streams the file directly and is the reliable path.
  if (Platform.OS !== 'web') {
    const res = await FileSystem.uploadAsync(`${BASE}/audio/transcriptions`, audioUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: 'audio/m4a',
      parameters: { model, language: 'en', response_format: 'json' },
      headers: authHeaders(apiKey),
    });
    if (res.status < 200 || res.status >= 300) {
      let message = `${res.status}`;
      try {
        message = JSON.parse(res.body)?.error?.message ?? res.body;
      } catch {
        message = res.body || `${res.status}`;
      }
      throw new OpenAIError(`Transcription failed: ${message}`);
    }
    try {
      return (JSON.parse(res.body).text ?? '').trim();
    } catch {
      throw new OpenAIError('Transcription returned an unexpected response.');
    }
  }

  // Web: a Blob in FormData works fine.
  const form = new FormData();
  const blob = await (await fetch(audioUri)).blob();
  form.append('file', blob, 'audio.m4a');
  form.append('model', model);
  form.append('language', 'en');
  form.append('response_format', 'json');

  const res = await fetch(`${BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: authHeaders(apiKey), // do NOT set Content-Type; let fetch add the boundary
    body: form,
  });

  if (!res.ok) throw new OpenAIError(`Transcription failed: ${await readError(res)}`);
  const data = await res.json();
  return (data.text ?? '').trim();
}

/** Lightweight per-recording capture: mistakes consolidated by type. */
export async function analyzeSpeaking(
  apiKey: string,
  topic: string,
  transcript: string,
  model: string,
): Promise<SessionAnalysis> {
  const content = await structuredCompletion(
    apiKey,
    model,
    ANALYSIS_SYSTEM_PROMPT,
    buildAnalysisUserMessage(topic, transcript),
    ANALYSIS_SCHEMA,
  );
  return JSON.parse(content) as SessionAnalysis;
}

export interface ReviewPlan {
  narrative: string;
  focus: string[];
  lessonPlan: LessonStep[];
}

/** Periodic synthesis: narrative + focus + consolidated lesson plan. */
export async function generateReviewPlan(
  apiKey: string,
  model: string,
  sessionCount: number,
  trendTable: string,
  topTypes: string,
): Promise<ReviewPlan> {
  const content = await structuredCompletion(
    apiKey,
    model,
    REVIEW_SYSTEM_PROMPT,
    buildReviewUserMessage(sessionCount, trendTable, topTypes),
    REVIEW_SCHEMA,
  );
  return JSON.parse(content) as ReviewPlan;
}

export interface LessonSpec {
  title: string;
  area: string;
  category: 'grammar' | 'vocabulary' | 'register';
  summary: string;
  basedOnTypes: string[];
}

/** Generate a prioritised learning path of micro-lessons from recurring mistakes. */
export async function generateLearningPath(
  apiKey: string,
  model: string,
  recurringContext: string,
): Promise<LessonSpec[]> {
  const content = await structuredCompletion(
    apiKey,
    model,
    LEARNING_PATH_SYSTEM_PROMPT,
    buildLearningPathUserMessage(recurringContext),
    LEARNING_PATH_SCHEMA,
  );
  const parsed = JSON.parse(content) as { lessons?: LessonSpec[] };
  return parsed.lessons ?? [];
}

async function structuredCompletion(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  schema: unknown,
): Promise<string> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { ...authHeaders(apiKey), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_schema', json_schema: schema },
    }),
  });

  if (!res.ok) throw new OpenAIError(await readError(res));
  const data = await res.json();
  recordChatUsage(model, data.usage);
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new OpenAIError('Model returned no content.');
  return content;
}

/** General chat completion, used for the practice tutor. */
export async function chatComplete(
  apiKey: string,
  messages: ChatMessageInput[],
  model: string,
): Promise<string> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { ...authHeaders(apiKey), 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, temperature: 0.6, messages }),
  });

  if (!res.ok) throw new OpenAIError(`Chat failed: ${await readError(res)}`);
  const data = await res.json();
  recordChatUsage(model, data.usage);
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new OpenAIError('Chat returned no content.');
  return content.trim();
}

/** Ask the model for a fresh business-English speaking topic. */
export async function generateTopic(apiKey: string, model: string): Promise<string> {
  const text = await chatComplete(
    apiKey,
    [{ role: 'user', content: TOPIC_GENERATION_PROMPT }],
    model,
  );
  return text.replace(/^["'\s]+|["'\s]+$/g, '');
}

/**
 * Text-to-speech. Returns raw audio bytes as a base64 string (mp3), suitable
 * for writing to a file and playing with expo-audio.
 */
export async function synthesizeSpeech(
  apiKey: string,
  text: string,
  model: string,
  voice: string,
): Promise<string> {
  useUsage.getState().recordTts(model, text.length);
  const res = await fetch(`${BASE}/audio/speech`, {
    method: 'POST',
    headers: { ...authHeaders(apiKey), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      voice,
      input: text,
      response_format: 'mp3',
      // Nudge towards a British delivery.
      instructions: 'Speak in a clear, professional British English accent.',
    }),
  });

  if (!res.ok) throw new OpenAIError(`Speech failed: ${await readError(res)}`);
  const buffer = await res.arrayBuffer();
  return arrayBufferToBase64(buffer);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)) as unknown as number[],
    );
  }
  // `btoa` is available in the RN/Hermes runtime and on web.
  return globalThis.btoa(binary);
}
