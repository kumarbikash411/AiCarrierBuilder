import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, typography } from '../theme/tokens';

export default function SubscriptionScreen() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api.get('/subscription/status').then(({ data }) => setStatus(data));
  }, []);

  async function handleSubscribe() {
    try {
      const { data } = await api.post('/subscription/create');

      Alert.alert(
        'Payment unavailable',
        'Razorpay checkout is not available in this Expo Go session. Please open the app in a development build or on a device with the native module installed.'
      );
      return;
    } catch (err) {
      if (err?.description) {
        Alert.alert('Payment not completed', err.description);
      } else {
        Alert.alert('Error', 'Could not start checkout. Please try again.');
      }
    }
  }

  return (
    <View style={styles.container}>
      <Text style={typography.h1}>AiCarrierBuilder Premium</Text>
      <Text style={styles.price}>₹499 / year</Text>
      <Text style={[typography.caption, { marginBottom: spacing.xl }]}>
        Status: {status?.status || 'Loading…'}
        {status?.currentPeriodEnd ? ` · renews ${new Date(status.currentPeriodEnd).toLocaleDateString('en-IN')}` : ''}
      </Text>

      <View style={{ marginBottom: spacing.xl }}>
        {[
          'Unlimited AI summary & bullet-point rewriting',
          'AI-suggested skills tailored to your target role',
          'Interview question prep with answer strategies',
          'Resume-to-job match scoring — see exactly what\'s missing',
          'AI-tailored cover letters per application',
          'Unlimited resumes with Modern & Classic templates',
        ].map((f) => (
          <Text key={f} style={styles.feature}>
            ✓ {f}
          </Text>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSubscribe}>
        <Text style={styles.buttonText}>
          {status?.status === 'ACTIVE' ? 'Manage / Renew Subscription' : 'Subscribe for ₹499/year'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Payments processed securely via Razorpay. Auto-renews yearly; cancel anytime.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg, paddingTop: spacing.xl },
  price: { color: colors.accent, fontSize: 36, fontWeight: '800', marginVertical: 10 },
  feature: { color: colors.textPrimary, marginBottom: 10, fontSize: 14 },
  button: { backgroundColor: colors.accent, borderRadius: radius.md, padding: 16 },
  buttonText: { color: colors.white, textAlign: 'center', fontWeight: '700', fontSize: 16 },
  disclaimer: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: spacing.md },
});
