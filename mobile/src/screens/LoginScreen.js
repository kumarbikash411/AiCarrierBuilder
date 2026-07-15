import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import LabeledInput from '../components/LabeledInput';
import { colors, spacing, radius, typography } from '../theme/tokens';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      Alert.alert('Login failed', err.response?.data?.error || 'Please try again');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.logo}>✦ AiCarrierBuilder</Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.xl }]}>
        Build a sharp resume, faster, with AI doing the heavy lifting.
      </Text>

      <LabeledInput
        label="Email"
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <LabeledInput label="Password" placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? 'Logging in…' : 'Log In'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>New here? Create an account</Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity style={styles.phoneButton} onPress={() => navigation.navigate('PhoneLogin')}>
        <Text style={styles.phoneButtonText}>📱 Continue with Phone Number</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.bg },
  logo: { fontSize: 30, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.xs },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: 16,
    marginTop: spacing.sm,
  },
  buttonText: { color: colors.white, textAlign: 'center', fontWeight: '700' },
  link: { color: colors.accentAlt, textAlign: 'center', marginTop: spacing.lg },
  divider: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, marginHorizontal: 12, fontSize: 12 },
  phoneButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
  },
  phoneButtonText: { color: colors.textPrimary, textAlign: 'center', fontWeight: '600' },
});
