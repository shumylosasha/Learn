import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './ui';
import { colors, font, radius, spacing } from '@/theme';
import type { Exercise, LessonStep } from '@/types';

export function LessonPlan({ steps }: { steps: LessonStep[] }) {
  return (
    <View style={{ gap: spacing.md }}>
      {steps.map((step, i) => (
        <LessonCard key={i} step={step} index={i} defaultOpen={i === 0} />
      ))}
    </View>
  );
}

function LessonCard({
  step,
  index,
  defaultOpen,
}: {
  step: LessonStep;
  index: number;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <Pressable style={styles.header} onPress={() => setOpen((o) => !o)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.index}>STEP {index + 1}</Text>
          <Text style={styles.title}>{step.title}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
      </Pressable>
      {open && (
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <Text style={styles.grammar}>{step.grammarExplanation}</Text>
          {step.exercises.map((ex, i) => (
            <ExerciseItem key={i} exercise={ex} number={i + 1} />
          ))}
        </View>
      )}
    </Card>
  );
}

function ExerciseItem({ exercise, number }: { exercise: Exercise; number: number }) {
  const [revealed, setRevealed] = useState(false);
  const kindLabel = exercise.kind.replace('_', ' ');
  return (
    <View style={styles.exercise}>
      <Text style={styles.exerciseKind}>
        {number}. {kindLabel}
      </Text>
      <Text style={styles.exercisePrompt}>{exercise.prompt}</Text>
      {exercise.options?.length ? (
        <View style={{ gap: 4, marginTop: 4 }}>
          {exercise.options.map((o, i) => (
            <Text key={i} style={styles.option}>
              • {o}
            </Text>
          ))}
        </View>
      ) : null}
      <Pressable onPress={() => setRevealed((r) => !r)} style={{ marginTop: spacing.xs }}>
        <Text style={styles.reveal}>{revealed ? 'Hide answer' : 'Show answer'}</Text>
      </Pressable>
      {revealed && (
        <View style={styles.answerBox}>
          <Text style={styles.answerText}>{exercise.answer}</Text>
          {exercise.hint ? <Text style={styles.hint}>{exercise.hint}</Text> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  index: { color: colors.success, fontSize: font.tiny, fontWeight: '800', letterSpacing: 1 },
  title: { color: colors.text, fontSize: font.h3, fontWeight: '700', marginTop: 2 },
  grammar: { color: colors.textMuted, fontSize: font.body, lineHeight: 23 },
  exercise: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  exerciseKind: {
    color: colors.textFaint,
    fontSize: font.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exercisePrompt: { color: colors.text, fontSize: font.body, lineHeight: 22 },
  option: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
  reveal: { color: colors.success, fontSize: font.small, fontWeight: '600' },
  answerBox: {
    marginTop: 4,
    borderLeftWidth: 2,
    borderLeftColor: colors.success,
    paddingLeft: spacing.md,
    gap: 2,
  },
  answerText: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  hint: { color: colors.textFaint, fontSize: font.small, fontStyle: 'italic' },
});
