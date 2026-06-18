import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSettings } from '@/store/settings';
import { useSessions } from '@/store/sessions';
import { useReviews } from '@/store/reviews';
import { maybeAutoReview } from '@/lib/review';
import { colors } from '@/theme';

export default function RootLayout() {
  const loadSettings = useSettings((s) => s.load);
  const loadSessions = useSessions((s) => s.load);
  const loadReviews = useReviews((s) => s.load);

  useEffect(() => {
    (async () => {
      // Load everything, then auto-generate a review if one is due.
      // Practice threads load lazily on the practice screen, keyed by id.
      await Promise.all([loadSettings(), loadSessions(), loadReviews()]);
      maybeAutoReview();
    })();
  }, [loadSettings, loadSessions, loadReviews]);

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
        <Stack.Screen name="session/[id]" options={{ title: 'Feedback' }} />
        <Stack.Screen
          name="practice/[id]"
          options={{ title: 'Practice', presentation: 'card' }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
