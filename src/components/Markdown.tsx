import React from 'react';
import { Platform, StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
import { colors, font } from '@/theme';

// Matches inline markdown spans: **bold**, __bold__, *italic*, _italic_, `code`.
const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_|`[^`]+`)/g;

/**
 * Renders a subset of markdown the chat tutor actually emits — bold, italic and
 * inline code — as styled text, instead of showing raw `**` asterisks. Line
 * breaks in the source are preserved. Deliberately tiny: no block elements, no
 * dependency, safe for a JS-only update.
 */
export function MarkdownText({
  content,
  style,
}: {
  content: string;
  style?: StyleProp<TextStyle>;
}) {
  const parts = content.split(INLINE).filter((p) => p.length > 0);
  return (
    <Text style={style}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={i} style={styles.bold}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (part.startsWith('__') && part.endsWith('__')) {
          return (
            <Text key={i} style={styles.bold}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <Text key={i} style={styles.code}>
              {part.slice(1, -1)}
            </Text>
          );
        }
        if (
          (part.startsWith('*') && part.endsWith('*')) ||
          (part.startsWith('_') && part.endsWith('_'))
        ) {
          return (
            <Text key={i} style={styles.italic}>
              {part.slice(1, -1)}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

export interface ParsedOption {
  letter: string;
  text: string;
}

// Lines like "A) had gone", "B. were", "(C) is" → selectable options.
const OPTION_LINE = /^\s*\(?([A-Da-d])[).]\s+(.+?)\s*$/;

/** Pull A/B/C-style multiple-choice options out of a tutor message, if any. */
export function parseOptions(content: string): ParsedOption[] {
  const out: ParsedOption[] = [];
  const seen = new Set<string>();
  for (const line of content.split('\n')) {
    const m = line.match(OPTION_LINE);
    if (m) {
      const letter = m[1].toUpperCase();
      if (seen.has(letter)) continue;
      seen.add(letter);
      // Strip inline markdown from the chip label so it reads cleanly.
      const text = m[2].replace(/[*_`]/g, '').trim();
      out.push({ letter, text });
    }
  }
  // Only treat it as a real multiple-choice question when there are 2+ options.
  return out.length >= 2 ? out : [];
}

const styles = StyleSheet.create({
  bold: { fontWeight: '700', color: colors.text },
  italic: { fontStyle: 'italic' },
  code: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: colors.surfaceAlt,
    fontSize: font.small,
  },
});
