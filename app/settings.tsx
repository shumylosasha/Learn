import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Label, SectionTitle } from '@/components/ui';
import { colors, font, radius, spacing } from '@/theme';
import { DEFAULT_PREFS, TTS_VOICES, useSettings } from '@/store/settings';
import { chatComplete } from '@/api/openai';
import { summarizeUsage, useUsage } from '@/store/usage';
import { formatUsd } from '@/lib/pricing';

export default function SettingsScreen() {
  const { apiKey, prefs, setApiKey, clearApiKey, setPrefs, loaded } = useSettings();
  const usage = useUsage();
  const loadUsage = useUsage((s) => s.load);
  const [keyInput, setKeyInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (loaded && apiKey) setKeyInput(apiKey);
  }, [loaded, apiKey]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  const summary = summarizeUsage(usage);

  const resetUsage = () => {
    Alert.alert('Reset usage counter?', 'This only clears the in-app estimate.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => usage.reset() },
    ]);
  };

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
      await chatComplete(k, [{ role: 'user', content: 'Reply with the single word: ok' }], prefs.chatModel);
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
            label="Smart model — analysis & lesson plan"
            value={prefs.smartModel}
            onChange={(v) => setPrefs({ smartModel: v })}
            placeholder={DEFAULT_PREFS.smartModel}
          />
          <ModelField
            label="Quick model — chat & topic ideas"
            value={prefs.chatModel}
            onChange={(v) => setPrefs({ chatModel: v })}
            placeholder={DEFAULT_PREFS.chatModel}
          />
          <Text style={styles.note}>
            Heavy tasks (finding your mistakes, building the path) use the smart model; the
            high-frequency chat uses the cheaper quick model. e.g. smart: gpt-5.4, quick:
            gpt-5.4-mini (~3× cheaper). Use gpt-5.4 for both if you want maximum quality.
          </Text>
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
        <SectionTitle>Usage & estimated cost</SectionTitle>
        <Card style={{ gap: spacing.md }}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Estimated spent so far</Text>
            <Text style={styles.totalValue}>{formatUsd(summary.totalCost)}</Text>
          </View>

          <UsageRow
            label="Analysis & tutor"
            detail={`${formatTokens(summary.chatTokens)} tokens`}
            cost={summary.chatCost}
          />
          <UsageRow
            label="Transcription"
            detail={`${summary.transcriptionMinutes.toFixed(1)} min`}
            cost={summary.transcriptionCost}
          />
          <UsageRow
            label="Speech (TTS)"
            detail={`${formatTokens(summary.ttsChars)} chars`}
            cost={summary.ttsCost}
          />

          <Pressable onPress={() => Linking.openURL('https://platform.openai.com/usage')}>
            <Text style={styles.link}>See exact billing at platform.openai.com/usage →</Text>
          </Pressable>
          <Text style={styles.note}>
            A rough on-device estimate from current public OpenAI prices — it can drift from your
            actual bill (which is the authoritative figure). Counted since you installed the app on
            this device.
          </Text>
          {summary.totalCost > 0 ? (
            <Button title="Reset counter" variant="secondary" onPress={resetUsage} />
          ) : null}
        </Card>
      </View>

      <Text style={styles.about}>
        Business English Coach · Speak → capture → weekly review → targeted practice. Built for
        British business English.
      </Text>
    </ScrollView>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function UsageRow({ label, detail, cost }: { label: string; detail: string; cost: number }) {
  return (
    <View style={styles.usageRow}>
      <Text style={styles.usageLabel}>{label}</Text>
      <Text style={styles.usageDetail}>{detail}</Text>
      <Text style={styles.usageCost}>{formatUsd(cost)}</Text>
    </View>
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
  screenTitle: { color: colors.text, fontSize: font.h1, fontWeight: '800' },
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
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: { color: colors.textMuted, fontSize: font.small },
  totalValue: { color: colors.text, fontSize: font.h2, fontWeight: '800' },
  usageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  usageLabel: { color: colors.text, fontSize: font.small, flex: 1 },
  usageDetail: { color: colors.textFaint, fontSize: font.tiny },
  usageCost: { color: colors.textMuted, fontSize: font.small, fontWeight: '700', minWidth: 56, textAlign: 'right' },
});
