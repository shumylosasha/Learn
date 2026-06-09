# Business English Coach 🇬🇧

A React Native (Expo) app to help you learn to **speak business English with a British register**.
You speak, the AI transcribes and analyses your grammar and word choice, points out your
mistakes, builds a targeted learning plan, and runs you through interactive practice — then you
speak again and it tracks which mistakes keep coming back.

## The idea

It's built for **daily use over time**, not one-off analysis. Each recording is captured
*lightly*; the real teaching happens in a **periodic review** that synthesises everything and
tracks whether you're actually improving.

1. **Speak** — pick (or AI-generate) a topic and record yourself. Recordings can be short or a
   full 30–60 min talk (audio is recorded at a low, speech-optimised bitrate so even long talks
   stay under the transcription upload limit).
2. **Capture (lightweight)** — your audio is transcribed (`gpt-4o-transcribe`) and analysed
   (`gpt-5.5`) into a *consolidated* list of mistake **types** with how often each occurs — not an
   exhaustive, overwhelming list. No per-recording lesson.
3. **Weekly review (the teaching)** — on a cadence (default weekly, or manual), the app aggregates
   all recordings since the last review, **compares against the previous review** to show what's
   *resolved / improving / persistent / worse / new*, writes an encouraging progress narrative, and
   produces one consolidated lesson plan for what to focus on now.
4. **Practise** — a persistent chat tutor drills you on your cumulative weak spots and the latest
   review's plan (translate, multiple choice, rewrite, fill-the-gap), with optional text-to-speech.
5. **Repeat** — the **Progress** tab shows the latest review, all-time recurring mistakes, past
   reviews, and your history grouped by day (each day = one "lesson").

> **On automation:** truly analysing "while you sleep" with the app closed isn't possible in a
> client-only app — there's no server and phones don't run background jobs reliably. So a due
> review is generated automatically *the next time you open the app*, plus a manual **Review now**
> button. True overnight processing would need the optional backend.

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
| Analysis/tutor | `gpt-5.5`            | Needs a model that supports JSON-schema outputs (e.g. `gpt-5.5`, `gpt-5.5-pro`). |
| Text-to-speech | `gpt-4o-mini-tts`    | Or `tts-1` / `tts-1-hd`.                          |
| TTS voice      | `ash`                | Pick any OpenAI voice.                            |

## Project layout

```
app/                     # expo-router screens
  (tabs)/
    index.tsx            # Speak / record
    progress.tsx         # Latest review, recurring mistakes, past reviews, history
    settings.tsx         # API key, model prefs, review cadence
  session/[id].tsx       # One recording: captured mistakes (lightweight)
  practice/[id].tsx      # Persistent weak-spots chat tutor
src/
  api/openai.ts          # OpenAI calls (transcribe, analyse, review, chat, TTS)
  api/prompts.ts         # System prompts + JSON schemas (capture + review)
  lib/                   # audio, topics, mistake aggregation + trends, pipeline, review
  store/                 # zustand stores (settings, sessions, reviews, practice)
  components/            # shared UI primitives + LessonPlan
  theme.ts, types.ts
```

## How improvement is tracked

Each recording's mistakes are consolidated by a reusable **type** label and counted by
*occurrences* (a 35-min talk that repeats an error 12× counts as 12). Each review stores a snapshot
of `{type: count}` for its period; the next review compares against it to label every type as
resolved / improved / persistent / worse / new — so progress is concrete, not vibes.

## Scope notes

- Analysis covers **grammar + vocabulary/register** only. Pronunciation/accent and filler-word
  analysis are intentionally out of scope (the transcript can't show them reliably).
- Swapping in Gemini/Claude later: the API layer is isolated in `src/api/`, so adding another
  provider behind the same functions is straightforward.
```
