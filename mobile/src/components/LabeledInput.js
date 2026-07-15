import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';

export default function LabeledInput({ label, style, multiline, ...props }) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      {label ? <Text style={[typography.label, { marginBottom: 6 }]}>{label.toUpperCase()}</Text> : null}
      <TextInput
        style={[styles.input, multiline && styles.multiline, style]}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surfaceAlt,
    color: colors.textPrimary,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 14,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
});
