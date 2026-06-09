import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Label, SectionTitle } from '@/components/ui';
import { colors, font, radius, spacing } from '@/theme';
import { DEFAULT_PREFS, TTS_VOICES, useSettings } from '@/store/settings';
import { chatComplete } from '@/api/openai';

export default function SettingsScreen() {
  const { apiKey, prefs, setApiKey, clearApiKey, setPrefs, loaded } = useSettings();
  const [keyInput, setKeyInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (loaded && apiKey) setKeyInput(apiKey);
  }, [loaded, apiKey]);

  const saveKey = async () => {
    const k = keyInput.trim();
    if (!k) {
      Alert.alert('Empty key', 'Paste your OpenAI API key first.');
      return;
    }
    await setApiKey(k);
    Alert.alert('Saved', 'Your API key is stored securely on this device.');
  };

  const testKey = async () => {
    const k = keyInput.trim();
    if (!k) return;
    setTesting(true);
    try {
      await chatComplete(k, [{ role: 'user', content: 'Reply with the single word: ok' }], prefs.analysisModel);
      Alert.alert('Working ✓', 'Your key and the analysis model are reachable.');
    } catch (e) {
      Alert.alert('Test failed', e instanceof Error ? e.message : 'Could not reach OpenAI.');
    } finally {
      setTesting(false);
    }
  };

  const removeKey = () => {
    Alert.alert('Remove key?', 'You will need to paste it again to use the app.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await clearApiKey();
          setKeyInput('');
        },
      },
    ]);
  };

  const masked = apiKey ? `${apiKey.slice(0, 6)}…${apiKey.slice(-4)}` : 'Not set';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View>
        <SectionTitle>OpenAI API key</SectionTitle>
        <Card style={{ gap: spacing.md }}>
          <Text style={styles.status}>
            Status: <Text style={{ color: apiKey ? colors.success : colors.warning }}>{masked}</Text>
          </Text>
          <View style={styles.keyRow}>
            <TextInput
              style={styles.input}
              value={revealed ? keyInput : keyInput.replace(/./g, '•')}
              onChangeText={setKeyInput}
              placeholder="sk-…"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={false}
            />
            <Pressable onPress={() => setRevealed((r) => !r)} hitSlop={8} style={styles.eye}>
              <Ionicons name={revealed ? 'eye-off' : 'eye'} size={20} color={colors.textMuted} />
            </Pressable>
          </View>
          <View style={styles.btnRow}>
            <Button title="Save" onPress={saveKey} style={{ flex: 1 }} />
            <Button title="Test" variant="secondary" onPress={testKey} loading={testing} style={{ flex: 1 }} />
          </View>
          {apiKey ? <Button title="Remove key" variant="danger" onPress={removeKey} /> : null}
          <Pressable onPress={() => Linking.openURL('https://platform.openai.com/api-keys')}>
            <Text style={styles.link}>Get a key at platform.openai.com/api-keys →</Text>
          </Pressable>
          <Text style={styles.note}>
            Your key is stored only on this device (in the secure keychain) and sent directly to
            OpenAI. There is no server in between.
          </Text>
        </Card>
      </View>

      <View>
        <SectionTitle>Models</SectionTitle>
        <Card style={{ gap: spacing.lg }}>
          <ModelField
            label="Transcription"
            value={prefs.transcriptionModel}
            onChange={(v) => setPrefs({ transcriptionModel: v })}
            placeholder={DEFAULT_PREFS.transcriptionModel}
          />
          <ModelField
            label="Analysis & tutor"
            value={prefs.analysisModel}
            onChange={(v) => setPrefs({ analysisModel: v })}
            placeholder={DEFAULT_PREFS.analysisModel}
          />
          <ModelField
            label="Text-to-speech"
            value={prefs.ttsModel}
            onChange={(v) => setPrefs({ ttsModel: v })}
            placeholder={DEFAULT_PREFS.ttsModel}
          />
          <View>
            <Label>TTS voice</Label>
            <View style={styles.voiceRow}>
              {TTS_VOICES.map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setPrefs({ ttsVoice: v })}
                  style={[
                    styles.voiceChip,
                    prefs.ttsVoice === v && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.voiceText,
                      prefs.ttsVoice === v && { color: colors.accentText },
                    ]}
                  >
                    {v}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Card>
      </View>

      <View>
        <SectionTitle>Reviews</SectionTitle>
        <Card style={{ gap: spacing.md }}>
          <Label>Auto-generate a cumulative review</Label>
          <View style={styles.voiceRow}>
            {[
              { label: 'Weekly', days: 7 },
              { label: 'Daily', days: 1 },
              { label: 'Manual only', days: 0 },
            ].map((opt) => (
              <Pressable
                key={opt.label}
                onPress={() => setPrefs({ reviewCadenceDays: opt.days })}
                style={[
                  styles.voiceChip,
                  prefs.reviewCadenceDays === opt.days && {
                    backgroundColor: colors.accent,
                    borderColor: colors.accent,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.voiceText,
                    prefs.reviewCadenceDays === opt.days && { color: colors.accentText },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.note}>
            When due, the review is generated automatically the next time you open the app. You can
            also tap “Review now” on the Progress tab anytime. True overnight processing isn’t
            possible without a server.
          </Text>
        </Card>
      </View>

      <Text style={styles.about}>
        Business English Coach · Speak → capture → weekly review → targeted practice. Built for
        British business English.
      </Text>
    </ScrollView>
  );
}

function ModelField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View>
      <Label>{label}</Label>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  status: { color: colors.textMuted, fontSize: font.small },
  keyRow: { position: 'relative', justifyContent: 'center' },
  input: {
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: font.body,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eye: { position: 'absolute', right: spacing.md },
  btnRow: { flexDirection: 'row', gap: spacing.sm },
  link: { color: colors.success, fontSize: font.small, fontWeight: '600' },
  note: { color: colors.textFaint, fontSize: font.tiny, lineHeight: 18 },
  voiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  voiceChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  voiceText: { color: colors.text, fontSize: font.small, fontWeight: '600' },
  about: { color: colors.textFaint, fontSize: font.tiny, textAlign: 'center', lineHeight: 18 },
});
