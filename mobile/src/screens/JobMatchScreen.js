import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import api from '../services/api';
import { Card, SectionHeader } from '../components/Card';
import LabeledInput from '../components/LabeledInput';
import { colors, spacing, radius, typography } from '../theme/tokens';

export default function JobMatchScreen() {
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [result, setResult] = useState(null);
  const [coverLetter, setCoverLetter] = useState(null);
  const [scoring, setScoring] = useState(false);
  const [writingLetter, setWritingLetter] = useState(false);

  useEffect(() => {
    api.get('/resumes').then(({ data }) => {
      setResumes(data);
      if (data.length) setSelectedResumeId(data[0].id);
    });
  }, []);

  async function handleScore() {
    if (!selectedResumeId) return Alert.alert('Create a resume first');
    if (!jobDescription.trim()) return Alert.alert('Paste a job description first');
    setScoring(true);
    setResult(null);
    setCoverLetter(null);
    try {
      const { data } = await api.post('/jobmatch/score', { resumeId: selectedResumeId, jobDescription });
      setResult(data);
    } catch (err) {
      if (err.response?.status === 402) {
        Alert.alert('Subscription needed', err.response.data.error);
      } else {
        Alert.alert('Error', 'Could not score this match right now.');
      }
    } finally {
      setScoring(false);
    }
  }

  async function handleCoverLetter() {
    setWritingLetter(true);
    try {
      const { data } = await api.post('/jobmatch/cover-letter', {
        resumeId: selectedResumeId,
        jobDescription,
        companyName,
      });
      setCoverLetter(data.letter);
    } catch (err) {
      Alert.alert('Error', 'Could not generate a cover letter right now.');
    } finally {
      setWritingLetter(false);
    }
  }

  const scoreColor = result ? (result.matchScore >= 70 ? colors.success : result.matchScore >= 40 ? '#F59E0B' : colors.danger) : colors.accent;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
      <SectionHeader title="Get Interview Calls" subtitle="See how well your resume matches a job — and fix what's missing" />

      <Card>
        <Text style={[typography.label, { marginBottom: 8 }]}>SELECT RESUME</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm }}>
          {resumes.map((r) => (
            <TouchableOpacity
              key={r.id}
              onPress={() => setSelectedResumeId(r.id)}
              style={[styles.resumeChip, selectedResumeId === r.id && styles.resumeChipActive]}
            >
              <Text style={[styles.resumeChipText, selectedResumeId === r.id && styles.resumeChipTextActive]}>{r.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {resumes.length === 0 && <Text style={typography.caption}>Create a resume first from the home screen.</Text>}

        <LabeledInput label="Company name (optional)" value={companyName} onChangeText={setCompanyName} />
        <LabeledInput
          label="Job description"
          multiline
          placeholder="Paste the full job posting here"
          value={jobDescription}
          onChangeText={setJobDescription}
        />
        <TouchableOpacity style={styles.actionBtn} onPress={handleScore} disabled={scoring}>
          {scoring ? <ActivityIndicator color={colors.white} /> : <Text style={styles.actionBtnText}>Check My Match Score</Text>}
        </TouchableOpacity>
      </Card>

      {result && (
        <Card>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreNumber, { color: scoreColor }]}>{result.matchScore}</Text>
            <Text style={typography.caption}>/ 100 estimated match</Text>
          </View>

          {result.matchingKeywords?.length > 0 && (
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[typography.label, { marginBottom: 6 }]}>MATCHING</Text>
              <Text style={typography.body}>{result.matchingKeywords.join(', ')}</Text>
            </View>
          )}

          {result.missingKeywords?.length > 0 && (
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[typography.label, { marginBottom: 6, color: colors.danger }]}>MISSING</Text>
              <Text style={typography.body}>{result.missingKeywords.join(', ')}</Text>
            </View>
          )}

          {result.suggestions?.length > 0 && (
            <View>
              <Text style={[typography.label, { marginBottom: 6 }]}>SUGGESTIONS</Text>
              {result.suggestions.map((s, i) => (
                <Text key={i} style={[typography.body, { marginBottom: 6 }]}>
                  • {s}
                </Text>
              ))}
            </View>
          )}

          <TouchableOpacity style={[styles.actionBtn, { marginTop: spacing.md }]} onPress={handleCoverLetter} disabled={writingLetter}>
            {writingLetter ? <ActivityIndicator color={colors.white} /> : <Text style={styles.actionBtnText}>Generate Tailored Cover Letter</Text>}
          </TouchableOpacity>
        </Card>
      )}

      {coverLetter && (
        <Card>
          <SectionHeader title="Cover Letter" />
          <Text style={[typography.body, { lineHeight: 21 }]}>{coverLetter}</Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  resumeChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  resumeChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  resumeChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  resumeChipTextActive: { color: colors.white },
  actionBtn: { backgroundColor: colors.accent, borderRadius: radius.md, padding: 14, marginTop: spacing.sm },
  actionBtnText: { color: colors.white, textAlign: 'center', fontWeight: '700' },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: spacing.md },
  scoreNumber: { fontSize: 42, fontWeight: '800' },
});
