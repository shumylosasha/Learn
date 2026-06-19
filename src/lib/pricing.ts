// Rough public OpenAI prices (USD), June 2026. Used only to ESTIMATE spend in
// the app — the authoritative figure is always platform.openai.com/usage.

// Chat / analysis models: USD per 1M tokens (input / output).
const CHAT_PRICES: Record<string, { in: number; out: number }> = {
  'gpt-5.5': { in: 5, out: 30 },
  'gpt-5.5-pro': { in: 30, out: 180 },
  'gpt-5.4': { in: 2.5, out: 15 },
  'gpt-5.4-mini': { in: 0.75, out: 4.5 },
  'gpt-5.4-nano': { in: 0.2, out: 1.25 },
};
const CHAT_FALLBACK = { in: 0.75, out: 4.5 };

// Transcription: USD per minute of audio.
const TRANSCRIBE_PER_MIN: Record<string, number> = {
  'gpt-4o-transcribe': 0.006,
  'gpt-4o-mini-transcribe': 0.003,
  'whisper-1': 0.006,
};
const TRANSCRIBE_FALLBACK = 0.006;

// Text-to-speech: USD per 1M characters of input (rough — TTS is a minor cost).
const TTS_PER_MCHAR: Record<string, number> = {
  'gpt-4o-mini-tts': 15,
  'tts-1': 15,
  'tts-1-hd': 30,
};
const TTS_FALLBACK = 15;

export function chatCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = CHAT_PRICES[model] ?? CHAT_FALLBACK;
  return (inputTokens / 1e6) * p.in + (outputTokens / 1e6) * p.out;
}

export function transcriptionCost(model: string, seconds: number): number {
  const perMin = TRANSCRIBE_PER_MIN[model] ?? TRANSCRIBE_FALLBACK;
  return (seconds / 60) * perMin;
}

export function ttsCost(model: string, chars: number): number {
  const perM = TTS_PER_MCHAR[model] ?? TTS_FALLBACK;
  return (chars / 1e6) * perM;
}

export function formatUsd(amount: number): string {
  if (amount === 0) return '$0.00';
  if (amount < 0.01) return '<$0.01';
  return `$${amount.toFixed(2)}`;
}
