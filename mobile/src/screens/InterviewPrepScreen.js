import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import api from '../services/api';
import { Card, SectionHeader } from '../components/Card';
import LabeledInput from '../components/LabeledInput';
import { QUESTION_BANK } from '../data/interviewQuestions';
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
  const [bankCategory, setBankCategory] = useState(Object.keys(QUESTION_BANK)[0]);

  async function generate() {
    if (!jobTitle.trim()) return Alert.alert('Enter a target role first');
    setLoading(true);
    try {
      const { data } = await api.post('/interview/questions', { jobTitle, jobDescription, experienceLevel });
      setQuestions(data.questions);
    } catch (err) {
      Alert.alert('Error', 'Could not generate questions right now.');
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

      <SectionHeader title="Question bank" subtitle="Common questions with answer tips for IT, bank and government interviews" />
      <View style={styles.chipRow}>
        {Object.keys(QUESTION_BANK).map((name) => (
          <TouchableOpacity key={name} onPress={() => setBankCategory(name)} style={[styles.chip, bankCategory === name && styles.chipActive]}>
            <Text style={[styles.chipText, bankCategory === name && styles.chipTextActive]}>{name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {QUESTION_BANK[bankCategory].map(([question, tip], i) => (
        <Card key={`${bankCategory}-${i}`}>
          <Text style={[typography.h3, { marginBottom: 8 }]}>{i + 1}. {question}</Text>
          <Text style={typography.caption}>💡 {tip}</Text>
        </Card>
      ))}

      {questions?.length ? <SectionHeader title="Your tailored questions" /> : null}
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: 7, paddingHorizontal: 12 },
  chipActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  chipText: { color: colors.textSecondary, fontSize: 12 },
  chipTextActive: { color: colors.white, fontWeight: '700' },
  qHeader: { marginBottom: 8 },
  categoryPill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 10 },
  categoryText: { fontSize: 11, fontWeight: '700' },
});
