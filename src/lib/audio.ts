import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

let activeRecording: Audio.Recording | null = null;

export async function ensureMicPermission(): Promise<boolean> {
  const { granted } = await Audio.requestPermissionsAsync();
  return granted;
}

export async function startRecording(): Promise<void> {
  if (activeRecording) {
    try {
      await activeRecording.stopAndUnloadAsync();
    } catch {
      /* ignore */
    }
    activeRecording = null;
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await recording.startAsync();
  activeRecording = recording;
}

export interface RecordingResult {
  uri: string;
  durationMs: number;
}

export async function stopRecording(): Promise<RecordingResult | null> {
  if (!activeRecording) return null;
  const recording = activeRecording;
  activeRecording = null;

  let durationMs = 0;
  try {
    const status = await recording.getStatusAsync();
    durationMs = status.durationMillis ?? 0;
  } catch {
    /* ignore */
  }

  await recording.stopAndUnloadAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  const uri = recording.getURI();
  if (!uri) return null;
  return { uri, durationMs };
}

export async function cancelRecording(): Promise<void> {
  if (!activeRecording) return;
  const recording = activeRecording;
  activeRecording = null;
  try {
    await recording.stopAndUnloadAsync();
  } catch {
    /* ignore */
  }
}

/** Play an audio file from a uri. Returns the Sound so the caller can unload it. */
export async function playUri(uri: string): Promise<Audio.Sound> {
  await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
  const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
  return sound;
}

/** Write base64 mp3 to a temp file and play it (used for TTS). */
export async function playBase64Mp3(base64: string): Promise<Audio.Sound> {
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
