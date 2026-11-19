import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import api from '../services/api';
import LabeledInput from '../components/LabeledInput';
import { colors, radius, spacing, typography } from '../theme/tokens';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return Alert.alert('Enter a valid email address');
    setBusy(true);
    try {
      await api.post('/auth/password-reset/email/send', { email: email.trim() });
      setCodeSent(true);
      Alert.alert('Check your email', 'If an account exists for this address, a 6-digit reset code has been sent.');
    } catch (err) {
      Alert.alert('Could not send code', err.response?.data?.error || 'Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!/^\d{6}$/.test(code.trim())) return Alert.alert('Enter the 6-digit code from your email');
    if (password.length < 8) return Alert.alert('Password must be at least 8 characters');
    if (password !== confirmPassword) return Alert.alert('Passwords do not match');

    setBusy(true);
    try {
      await api.post('/auth/password-reset/email/complete', {
        email: email.trim(),
        code: code.trim(),
        password,
      });
      Alert.alert('Password updated', 'You can now log in with your new password.', [
        { text: 'Go to Log In', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err) {
      Alert.alert('Could not reset password', err.response?.data?.error || 'Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={typography.h1}>Reset your password</Text>
      <Text style={[typography.body, styles.description]}>
        We’ll email a one-time code to the address on your account. The code expires after 10 minutes.
      </Text>

      <LabeledInput
        label="Email"
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!codeSent && !busy}
      />

      {!codeSent ? (
        <TouchableOpacity style={styles.button} onPress={sendCode} disabled={busy}>
          <Text style={styles.buttonText}>{busy ? 'Sending…' : 'Send reset code'}</Text>
        </TouchableOpacity>
      ) : (
        <>
          <LabeledInput
            label="6-digit email code"
            placeholder="123456"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
            maxLength={6}
          />
          <LabeledInput label="New password" placeholder="At least 8 characters" secureTextEntry value={password} onChangeText={setPassword} />
          <LabeledInput label="Confirm new password" placeholder="Enter it again" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
          <TouchableOpacity style={styles.button} onPress={resetPassword} disabled={busy}>
            <Text style={styles.buttonText}>{busy ? 'Updating…' : 'Set new password'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={sendCode} disabled={busy}>
            <Text style={styles.link}>{busy ? 'Sending…' : 'Resend code'}</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Back to Log In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.bg },
  description: { color: colors.textSecondary, marginTop: 6, marginBottom: spacing.xl },
  button: { backgroundColor: colors.accent, borderRadius: radius.md, padding: 16, marginTop: spacing.sm },
  buttonText: { color: colors.white, textAlign: 'center', fontWeight: '700' },
  secondaryButton: { paddingVertical: spacing.md },
  footer: { alignItems: 'center', marginTop: spacing.lg },
  link: { color: colors.accentAlt, textAlign: 'center', fontWeight: '600' },
});
