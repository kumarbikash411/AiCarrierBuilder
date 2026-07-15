import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import api from '../services/api';
import { Card, SectionHeader } from '../components/Card';
import LabeledInput from '../components/LabeledInput';
import { colors, spacing, radius, typography } from '../theme/tokens';

const CATEGORY_COLOR = {
  Behavioral: colors.accentAlt,
  Technical: colors.accent,
  'Role-specific': colors.success,
  Situational: '#F59E0B',
};

export default function InterviewPrepScreen() {
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('mid-level');
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!jobTitle.trim()) return Alert.alert('Enter a target role first');
    setLoading(true);
    try {
      const { data } = await api.post('/interview/questions', { jobTitle, jobDescription, experienceLevel });
      setQuestions(data.questions);
    } catch (err) {
      if (err.response?.status === 402) {
        Alert.alert('Subscription needed', err.response.data.error);
      } else {
        Alert.alert('Error', 'Could not generate questions right now.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
      <SectionHeader title="Interview Prep" subtitle="Practice with questions tailored to your target role" />

      <Card>
        <LabeledInput label="Target role" placeholder="e.g. Product Manager" value={jobTitle} onChangeText={setJobTitle} />
        <LabeledInput
          label="Experience level"
          placeholder="entry-level, mid-level, senior..."
          value={experienceLevel}
          onChangeText={setExperienceLevel}
        />
        <LabeledInput
          label="Job description (optional, improves accuracy)"
          multiline
          placeholder="Paste the job posting here for more targeted questions"
          value={jobDescription}
          onChangeText={setJobDescription}
        />
        <TouchableOpacity style={styles.generateBtn} onPress={generate} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.generateBtnText}>Generate Questions</Text>}
        </TouchableOpacity>
      </Card>

      {questions?.map((q, i) => (
        <Card key={i}>
          <View style={styles.qHeader}>
            <View style={[styles.categoryPill, { backgroundColor: (CATEGORY_COLOR[q.category] || colors.accent) + '22' }]}>
              <Text style={[styles.categoryText, { color: CATEGORY_COLOR[q.category] || colors.accent }]}>{q.category}</Text>
            </View>
          </View>
          <Text style={[typography.h3, { marginBottom: 8 }]}>{q.question}</Text>
          <Text style={typography.caption}>💡 {q.tip}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  generateBtn: { backgroundColor: colors.accent, borderRadius: radius.md, padding: 14, marginTop: spacing.sm },
  generateBtnText: { color: colors.white, textAlign: 'center', fontWeight: '700' },
  qHeader: { marginBottom: 8 },
  categoryPill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 10 },
  categoryText: { fontSize: 11, fontWeight: '700' },
});
