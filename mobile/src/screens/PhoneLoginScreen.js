import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import LabeledInput from '../components/LabeledInput';
import { colors, spacing, radius, typography } from '../theme/tokens';

export default function PhoneLoginScreen({ navigation }) {
  const { sendOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSendOtp() {
    if (phone.trim().length < 10) return Alert.alert('Enter a valid phone number');
    setBusy(true);
    try {
      await sendOtp(phone.trim());
      setStep('otp');
    } catch (err) {
      Alert.alert('Could not send OTP', err.response?.data?.error || 'Please try again');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    if (code.trim().length !== 6) return Alert.alert('Enter the 6-digit code');
    setBusy(true);
    try {
      await verifyOtp(phone.trim(), code.trim(), name.trim() || undefined);
    } catch (err) {
      Alert.alert('Verification failed', err.response?.data?.error || 'Invalid or expired code');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={typography.h1}>{step === 'phone' ? 'Log in with phone' : 'Enter the code'}</Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4, marginBottom: spacing.xl }]}>
        {step === 'phone'
          ? "We'll text you a 6-digit code — no password needed."
          : `Sent to ${phone}. Code expires in 5 minutes.`}
      </Text>

      {step === 'phone' ? (
        <>
          <LabeledInput
            label="Phone number"
            placeholder="+91XXXXXXXXXX"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <LabeledInput
            label="Name (only needed if you're new)"
            placeholder="Jane Doe"
            value={name}
            onChangeText={setName}
          />
          <TouchableOpacity style={styles.button} onPress={handleSendOtp} disabled={busy}>
            <Text style={styles.buttonText}>{busy ? 'Sending…' : 'Send Code'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <LabeledInput
            label="6-digit code"
            placeholder="123456"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
          />
          <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={busy}>
            <Text style={styles.buttonText}>{busy ? 'Verifying…' : 'Verify & Log In'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStep('phone')}>
            <Text style={styles.link}>Change phone number</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Use email instead</Text>
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
