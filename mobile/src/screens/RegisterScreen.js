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
  const [referralCode, setReferralCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleRegister() {
    if (name.trim().length < 2) return Alert.alert('Enter your full name');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return Alert.alert('Enter a valid email address');
    if (password.length < 8) return Alert.alert('Password must be at least 8 characters');
    setBusy(true);
    try {
      await register(name, email, password, referralCode);
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
      <LabeledInput label="Referral code (optional)" placeholder="CAREER-XXXXXXXX" autoCapitalize="characters" value={referralCode} onChangeText={setReferralCode} />
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
