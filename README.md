# Business English Coach 🇬🇧

A React Native (Expo) app to help you learn to **speak business English with a British register**.
You speak, the AI transcribes and analyses your grammar and word choice, points out your
mistakes, builds a targeted learning plan, and runs you through interactive practice — then you
speak again and it tracks which mistakes keep coming back.

## The loop

1. **Speak** — pick (or AI-generate) a business topic and record yourself for ~30–120 seconds.
2. **Analyse** — your audio is transcribed (Whisper / `gpt-4o-transcribe`) and analysed
   (`gpt-4o`) for grammar, sentence structure, vocabulary and business register.
3. **Feedback** — see each mistake (what you said → the correct British version + why), your
   strengths, a CEFR level estimate, and a step-by-step learning plan with exercises.
4. **Practise** — a chat-based tutor drills you on your actual weak spots (translate, multiple
   choice, rewrite, fill-the-gap), with optional text-to-speech.
5. **Repeat** — the **Progress** tab aggregates recurring mistakes across all sessions so you
   know what to focus on.

## Tech

- **Expo / React Native + TypeScript**, file-based routing (`expo-router`). Runs on iOS and
  natively on Apple-silicon Macs (it's an iOS app), plus web for quick dev.
- **OpenAI** for everything: transcription, analysis (structured JSON output), the practice
  tutor, and TTS.
- **Client-only** — no backend. Your OpenAI API key is stored on-device in the secure keychain
  (`expo-secure-store`) and calls go straight to OpenAI.
- Sessions and progress are persisted locally with AsyncStorage.

## Getting started

```bash
npm install

# iOS Simulator (needs Xcode on a Mac) — builds a dev client:
npm run ios

# or start Metro and choose a target (press i for iOS, w for web):
npm start
```

Then open **Settings** in the app and paste your OpenAI API key
(get one at https://platform.openai.com/api-keys). Tap **Test** to confirm it works.

> Microphone recording requires a real device or the iOS Simulator — it won't capture audio in a
> desktop browser the same way, but the rest of the UI works on web for development.

## Configuration

Everything is adjustable in **Settings → Models**:

| Setting        | Default              | Notes                                            |
| -------------- | -------------------- | ------------------------------------------------ |
| Transcription  | `gpt-4o-transcribe`  | Or `whisper-1`. Accepts the recorded `.m4a`.     |
| Analysis/tutor | `gpt-4o`             | Needs a model that supports JSON-schema outputs. |
| Text-to-speech | `gpt-4o-mini-tts`    | Or `tts-1` / `tts-1-hd`.                          |
| TTS voice      | `ash`                | Pick any OpenAI voice.                            |

## Project layout

```
app/                     # expo-router screens
  (tabs)/
    index.tsx            # Speak / record
    progress.tsx         # Recurring mistakes + history
    settings.tsx         # API key + model prefs
  session/[id].tsx       # Transcript, mistakes, learning plan
  practice/[id].tsx      # Chat tutor
src/
  api/openai.ts          # OpenAI calls (transcribe, analyse, chat, TTS)
  api/prompts.ts         # System prompts + analysis JSON schema
  lib/                   # audio, topics, mistake aggregation, pipeline
  store/                 # zustand stores (settings, sessions) + secure storage
  components/ui.tsx      # shared UI primitives
  theme.ts, types.ts
```

## Scope notes (v1)

- Analysis covers **grammar + vocabulary/register** only. Pronunciation/accent and filler-word
  analysis are intentionally out of scope (the transcript can't show them reliably).
- Swapping in Gemini/Claude later: the API layer is isolated in `src/api/`, so adding another
  provider behind the same functions is straightforward.
```
