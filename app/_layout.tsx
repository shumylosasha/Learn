import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSettings } from '@/store/settings';
import { useSessions } from '@/store/sessions';
import { usePath } from '@/store/path';
import { useUsage } from '@/store/usage';
import { colors } from '@/theme';

export default function RootLayout() {
  const loadSettings = useSettings((s) => s.load);
  const loadSessions = useSessions((s) => s.load);
  const loadPath = usePath((s) => s.load);
  const loadUsage = useUsage((s) => s.load);

  useEffect(() => {
    (async () => {
      // Load core stores up front. Practice threads load lazily, keyed by id.
      await Promise.all([loadSettings(), loadSessions(), loadPath(), loadUsage()]);
    })();
  }, [loadSettings, loadSessions, loadPath, loadUsage]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="record" options={{ title: 'New recording', presentation: 'card' }} />
        <Stack.Screen name="session/[id]" options={{ title: 'Recording' }} />
        <Stack.Screen name="flashcards/[id]" options={{ title: 'Flashcards', presentation: 'card' }} />
        <Stack.Screen
          name="practice/[id]"
          options={{ title: 'Practice', presentation: 'card' }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
