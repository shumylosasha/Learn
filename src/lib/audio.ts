import {
  AudioModule,
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioRecorder,
  type RecordingOptions,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

let activeRecording: AudioRecorder | null = null;

// Speech-optimised, low-bitrate mono so even a 35–60 min talk stays well under
// the transcription API's 25 MB upload limit (~32 kbps ≈ 8 MB for 35 min).
const SPEECH_RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 32000,
};

export async function ensureMicPermission(): Promise<boolean> {
  const { granted } = await requestRecordingPermissionsAsync();
  return granted;
}

export async function startRecording(): Promise<void> {
  if (activeRecording) {
    try {
      await activeRecording.stop();
    } catch {
      /* ignore */
    }
    activeRecording = null;
  }

  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

  const recorder = new AudioModule.AudioRecorder(SPEECH_RECORDING_OPTIONS);
  await recorder.prepareToRecordAsync(SPEECH_RECORDING_OPTIONS);
  recorder.record();
  activeRecording = recorder;
}

export interface RecordingResult {
  uri: string;
  durationMs: number;
}

export async function stopRecording(): Promise<RecordingResult | null> {
  if (!activeRecording) return null;
  const recorder = activeRecording;
  activeRecording = null;

  let durationMs = 0;
  try {
    durationMs = recorder.getStatus().durationMillis ?? 0;
  } catch {
    /* ignore */
  }

  await recorder.stop();
  await setAudioModeAsync({ allowsRecording: false });
  const uri = recorder.uri;
  if (!uri) return null;
  return { uri, durationMs };
}

export async function cancelRecording(): Promise<void> {
  if (!activeRecording) return;
  const recorder = activeRecording;
  activeRecording = null;
  try {
    await recorder.stop();
  } catch {
    /* ignore */
  }
}

/** Play an audio file from a uri. Returns the player so the caller can stop/remove it. */
export async function playUri(uri: string): Promise<AudioPlayer> {
  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
  const player = createAudioPlayer({ uri });
  player.play();
  return player;
}

/** Write base64 mp3 to a temp file and play it (used for TTS). */
export async function playBase64Mp3(base64: string): Promise<AudioPlayer> {
  const path = `${FileSystem.cacheDirectory}tts-${Date.now()}.mp3`;
  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return playUri(path);
}

export function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
