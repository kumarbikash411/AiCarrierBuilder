import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import LabeledInput from '../components/LabeledInput';
import { colors, spacing, radius, typography } from '../theme/tokens';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleRegister() {
    setBusy(true);
    try {
      await register(name, email, password);
    } catch (err) {
      Alert.alert('Sign up failed', err.response?.data?.error || 'Please try again');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={typography.h1}>Create your account</Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.xl, marginTop: 4 }]}>
        Free to start — no credit card needed.
      </Text>

      <LabeledInput label="Full name" placeholder="Jane Doe" value={name} onChangeText={setName} />
      <LabeledInput
        label="Email"
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <LabeledInput
        label="Password"
        placeholder="min 8 characters"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? 'Creating…' : 'Create Account'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.bg },
  button: { backgroundColor: colors.accent, borderRadius: radius.md, padding: 16, marginTop: spacing.sm },
  buttonText: { color: colors.white, textAlign: 'center', fontWeight: '700' },
  link: { color: colors.accentAlt, textAlign: 'center', marginTop: spacing.lg },
});
