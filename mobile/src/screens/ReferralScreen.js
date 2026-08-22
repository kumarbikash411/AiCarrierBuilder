import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { Card, SectionHeader } from '../components/Card';
import { colors, radius, spacing, typography } from '../theme/tokens';

export default function ReferralScreen() {
  const [reward, setReward] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/referral');
      setReward(data);
    } catch {
      Alert.alert('Could not load rewards', 'Please check your connection and try again.');
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function shareReferral() {
    if (!reward) return;
    try {
      await Share.share({
        message: `Build your resume and prepare for jobs with AiCarrierBuilder. Use my referral code ${reward.referralCode} when you create your account: https://play.google.com/store/apps/details?id=com.bikashkumar.resumeai`,
      });
    } catch {
      Alert.alert('Could not open sharing options');
    }
  }

  if (!reward) return <View style={styles.loading}><ActivityIndicator color={colors.accent} /></View>;

  return (
    <View style={styles.container}>
      <SectionHeader title="Refer & Earn" subtitle={`Earn ${reward.pointsPerReferral} points for each friend who joins with your code.`} />
      <Card style={styles.pointsCard}>
        <Text style={typography.caption}>YOUR POINTS</Text>
        <Text style={styles.points}>{reward.points}</Text>
        <Text style={typography.caption}>{reward.referrals} successful referral{reward.referrals === 1 ? '' : 's'}</Text>
      </Card>
      <Card>
        <Text style={[typography.label, { marginBottom: spacing.sm }]}>YOUR REFERRAL CODE</Text>
        <View style={styles.codeBox}><Text style={styles.code}>{reward.referralCode}</Text></View>
        <Text style={[typography.caption, { marginTop: spacing.md }]}>Share this code. Your friend enters it during their first registration. You receive points after their account is created.</Text>
        <TouchableOpacity style={styles.button} onPress={shareReferral}><Text style={styles.buttonText}>Share referral code</Text></TouchableOpacity>
      </Card>
      <Text style={[typography.caption, styles.note]}>Points are earned once per newly registered account. Points currently appear as rewards balance; redemption options can be added later.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  pointsCard: { alignItems: 'center', paddingVertical: spacing.xl }, points: { fontSize: 48, lineHeight: 58, color: colors.success, fontWeight: '800', marginVertical: 4 },
  codeBox: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.accentAlt, borderStyle: 'dashed', padding: spacing.md, borderRadius: radius.sm, alignItems: 'center' }, code: { color: colors.accentAlt, fontSize: 19, fontWeight: '800', letterSpacing: 1.1 },
  button: { marginTop: spacing.lg, backgroundColor: colors.accent, padding: 15, borderRadius: radius.md }, buttonText: { color: colors.white, textAlign: 'center', fontWeight: '700' }, note: { textAlign: 'center', lineHeight: 18, paddingHorizontal: spacing.sm },
});
