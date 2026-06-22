import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { font, type Palette, radius, spacing, useColors } from '@/theme';

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const isDisabled = disabled || loading;
  const palette: Record<string, { bg: string; fg: string; border?: string }> = {
    primary: { bg: c.accent, fg: c.accentText },
    secondary: { bg: c.surfaceAlt, fg: c.text, border: c.border },
    ghost: { bg: 'transparent', fg: c.textMuted },
    danger: { bg: 'transparent', fg: c.danger, border: c.danger },
  };
  const p = palette[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: p.bg,
          borderColor: p.border ?? 'transparent',
          borderWidth: p.border ? 1 : 0,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <Text style={[styles.buttonText, { color: p.fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Pill({
  label,
  color,
  filled,
}: {
  label: string;
  color?: string;
  filled?: boolean;
}) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const tint = color ?? c.textMuted;
  return (
    <View
      style={[
        styles.pill,
        filled
          ? { backgroundColor: tint }
          : { borderColor: tint, borderWidth: 1, backgroundColor: 'transparent' },
      ]}
    >
      <Text style={[styles.pillText, { color: filled ? c.bg : tint }]}>{label}</Text>
    </View>
  );
}

export function Empty({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
    </View>
  );
}

export function Label({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return <Text style={[styles.label, style]}>{children}</Text>;
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      color: colors.textMuted,
      fontSize: font.tiny,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
    },
    button: {
      borderRadius: radius.md,
      paddingVertical: spacing.md + 2,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      fontSize: font.body,
      fontWeight: '700',
    },
    pill: {
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: radius.pill,
      alignSelf: 'flex-start',
    },
    pillText: {
      fontSize: font.tiny,
      fontWeight: '700',
    },
    empty: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.lg,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: font.h3,
      fontWeight: '700',
      textAlign: 'center',
    },
    emptySub: {
      color: colors.textMuted,
      fontSize: font.small,
      textAlign: 'center',
      marginTop: spacing.sm,
      lineHeight: 20,
    },
    label: {
      color: colors.textMuted,
      fontSize: font.small,
      marginBottom: spacing.xs,
    },
  });
