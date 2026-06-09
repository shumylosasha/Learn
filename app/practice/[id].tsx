import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Audio } from 'expo-av';
import { Empty } from '@/components/ui';
import { colors, font, radius, spacing } from '@/theme';
import { useSessions } from '@/store/sessions';
import { useSettings } from '@/store/settings';
import { useReviews } from '@/store/reviews';
import { usePractice } from '@/store/practice';
import { chatComplete, synthesizeSpeech, type ChatMessageInput } from '@/api/openai';
import { practiceSystemPrompt } from '@/api/prompts';
import { aggregateRecurringMistakes, recurringMistakesContext } from '@/lib/mistakes';
import { playBase64Mp3 } from '@/lib/audio';
import type { ChatMessage } from '@/types';

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function PracticeScreen() {
  const allSessions = useSessions((s) => s.sessions);
  const latestReview = useReviews((s) => s.reviews[0]);
  const messages = usePractice((s) => s.messages);
  const append = usePractice((s) => s.append);
  const reset = usePractice((s) => s.reset);
  const apiKey = useSettings((s) => s.apiKey);
  const prefs = useSettings((s) => s.prefs);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const kickedOff = useRef(false);

  const systemPrompt = (): string => {
    const weakSpots = recurringMistakesContext(aggregateRecurringMistakes(allSessions));
    const planContext = latestReview
      ? `Focus areas: ${latestReview.focus.join(', ')}.\n` +
        latestReview.lessonPlan
          .map((s) => `• ${s.title}: ${s.grammarExplanation}`)
          .join('\n')
      : 'No review yet — work from the recurring weak spots above.';
    return practiceSystemPrompt(weakSpots, planContext);
  };

  const send = async (text: string) => {
    if (!apiKey) return;
    setSending(true);
    try {
      const history: ChatMessageInput[] = [
        { role: 'system', content: systemPrompt() },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ];
      if (text) {
        append({ id: uid(), role: 'user', content: text, createdAt: Date.now() });
        history.push({ role: 'user', content: text });
      }
      const reply = await chatComplete(apiKey, history, prefs.analysisModel);
      append({ id: uid(), role: 'assistant', content: reply, createdAt: Date.now() });
    } catch (e) {
      append({
        id: uid(),
        role: 'assistant',
        content: `⚠️ ${e instanceof Error ? e.message : 'Something went wrong.'}`,
        createdAt: Date.now(),
      });
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  // Kick off the tutor's opening message once, if the thread is empty.
  useEffect(() => {
    if (!kickedOff.current && messages.length === 0 && apiKey) {
      kickedOff.current = true;
      send('');
    }
  }, [messages.length, apiKey]);

  const onSend = () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    send(text);
  };

  const onReset = () => {
    Alert.alert('Start fresh?', 'This clears the current practice conversation.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          reset();
          kickedOff.current = false;
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          title: 'Practice',
          headerRight: () => (
            <Pressable onPress={onReset} hitSlop={10}>
              <Ionicons name="refresh" size={20} color={colors.textMuted} />
            </Pressable>
          ),
        }}
      />
      {!apiKey ? (
        <Empty title="Add your API key" subtitle="Set your OpenAI key in Settings to practise." />
      ) : (
        <>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.chat}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 && sending && (
              <Text style={styles.warming}>Your tutor is getting ready…</Text>
            )}
            {messages.map((m) => (
              <Bubble
                key={m.id}
                message={m}
                ttsModel={prefs.ttsModel}
                voice={prefs.ttsVoice}
                apiKey={apiKey}
              />
            ))}
            {sending && messages.length > 0 && (
              <View style={[styles.bubble, styles.assistant]}>
                <ActivityIndicator color={colors.textMuted} />
              </View>
            )}
          </ScrollView>

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type your answer…"
              placeholderTextColor={colors.textFaint}
              multiline
              onSubmitEditing={onSend}
            />
            <Pressable
              onPress={onSend}
              disabled={!input.trim() || sending}
              style={[styles.sendBtn, { opacity: !input.trim() || sending ? 0.4 : 1 }]}
            >
              <Ionicons name="arrow-up" size={22} color={colors.accentText} />
            </Pressable>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

function Bubble({
  message,
  ttsModel,
  voice,
  apiKey,
}: {
  message: ChatMessage;
  ttsModel: string;
  voice: string;
  apiKey: string;
}) {
  const isUser = message.role === 'user';
  const [loadingTts, setLoadingTts] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const speak = async () => {
    setLoadingTts(true);
    try {
      const base64 = await synthesizeSpeech(apiKey, message.content, ttsModel, voice);
      soundRef.current = await playBase64Mp3(base64);
    } catch {
      /* ignore */
    } finally {
      setLoadingTts(false);
    }
  };

  return (
    <View style={[styles.bubble, isUser ? styles.user : styles.assistant]}>
      <Text style={styles.bubbleText}>{message.content}</Text>
      {!isUser && (
        <Pressable onPress={speak} style={styles.speakBtn} hitSlop={8}>
          {loadingTts ? (
            <ActivityIndicator size="small" color={colors.textFaint} />
          ) : (
            <Ionicons name="volume-medium-outline" size={16} color={colors.textFaint} />
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chat: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  warming: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  bubble: { maxWidth: '88%', borderRadius: radius.lg, padding: spacing.md },
  user: { alignSelf: 'flex-end', backgroundColor: colors.accentSoft, borderBottomRightRadius: 4 },
  assistant: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { color: colors.text, fontSize: font.body, lineHeight: 23 },
  speakBtn: { marginTop: spacing.sm, alignSelf: 'flex-start' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm + 2,
    fontSize: font.body,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
