import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
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
      const { data: order } = await api.post('/subscription/create-order');
      const payment = await RazorpayCheckout.open({
        key: order.razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: 'AiCarrierBuilder',
        description: 'Premium annual plan',
        order_id: order.order_id,
        prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
        theme: { color: colors.accent },
      });

      await api.post('/subscription/verify-payment', payment);
      const { data: updatedStatus } = await api.get('/subscription/status');
      setStatus(updatedStatus);
      Alert.alert('Payment successful', 'Your Premium access is active for one year.');
    } catch (err) {
      if (err?.code === 0) {
        Alert.alert('Payment cancelled', 'No payment was made.');
      } else if (err?.description) {
        Alert.alert('Payment failed', err.description);
      } else if (err?.response?.data?.error) {
        Alert.alert('Payment error', err.response.data.error);
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
        {status?.currentPeriodEnd ? ` · access until ${new Date(status.currentPeriodEnd).toLocaleDateString('en-IN')}` : ''}
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
        Payments are processed securely via Razorpay. Your Premium access lasts one year.
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
