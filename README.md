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

## Where do I put my OpenAI key?

**Not in any file.** Launch the app → **Settings** tab → paste your key into **OpenAI API key** →
**Save** → **Test**. It's stored only on-device (iOS Keychain) and sent straight to OpenAI. Get a
key at <https://platform.openai.com/api-keys> (you'll need billing enabled on your OpenAI account).

## Getting started

Built on **Expo SDK 56** (React 19 / React Native 0.85). Recording uses **`expo-audio`**.

```bash
npm install
npx expo start            # press  i = iOS simulator,  w = web
```

### Run on your iPhone — quick (Expo Go, Mac tethered)

1. Install **Expo Go** from the App Store.
2. `npx expo start` on the Mac, iPhone + Mac on the same Wi-Fi.
3. Scan the QR with the iPhone Camera. Allow microphone access.
   (Expo Go must support SDK 56; the Mac dev server stays running while you use it.)

### Run on your iPhone — standalone (no Mac needed to use it)

Best for daily use. Requires a free **Expo account** and your **Apple Developer account**.

```bash
npm i -g eas-cli
eas login
eas init                  # links the project, writes extra.eas.projectId into app.json

# Option A — ad-hoc build, installs straight onto your registered device (no App Store review):
eas device:create         # register your iPhone (one-time)
eas build -p ios --profile preview
# open the build link on your iPhone and install. Done — works with the Mac closed.

# Option B — TestFlight (nicer updates, light Apple review):
eas build -p ios --profile production
eas submit -p ios         # then install via the TestFlight app
```

After the first native build, JS-only changes can be shipped instantly without rebuilding:
`eas update --channel preview` (or `production`).

> Microphone recording needs a real device or the iOS Simulator. The web target runs the UI for
> development but mic/keychain behave differently there.

## Configuration

Everything is adjustable in **Settings → Models**:

| Setting        | Default              | Notes                                            |
| -------------- | -------------------- | ------------------------------------------------ |
| Transcription  | `gpt-4o-transcribe`  | Or `whisper-1`. Accepts the recorded `.m4a`.     |
| Analysis/tutor | `gpt-5.4`            | Mid-tier price; needs JSON-schema output support (also `gpt-5.5`, `gpt-5.5-pro`). |
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
