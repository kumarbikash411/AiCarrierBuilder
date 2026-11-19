import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import api from '../services/api';
import { Card } from '../components/Card';
import { colors, spacing, radius, typography } from '../theme/tokens';
import { emptyResumeContent } from '../templates/resumeData';

const TEMPLATE_LABEL = { modern: 'Modern', classic: 'Classic', minimal: 'Minimal' };

export default function ResumeListScreen({ navigation }) {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        try {
          const { data } = await api.get('/resumes');
          setResumes(data);
        } finally {
          setLoading(false);
        }
      })();
    }, [])
  );

  async function createResume() {
    const { data } = await api.post('/resumes', {
      title: 'Untitled Resume',
      template: 'modern',
      content: emptyResumeContent,
    });
    navigation.navigate('Editor', { resumeId: data.id });
  }

  async function importResume() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const file = result.assets[0];
    if (file.size && file.size > 10 * 1024 * 1024) {
      return Alert.alert('File too large', 'Choose a resume file smaller than 10 MB.');
    }

    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    const form = new FormData();
    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || (isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    });

    setImporting(true);
    try {
      const { data } = await api.post('/resumes/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      const review = data.aiReview;
      const feedback = [
        review.scoreSummary,
        review.strengths.length ? `Strengths: ${review.strengths.slice(0, 2).join('; ')}` : null,
        review.improvements.length ? `Try next: ${review.improvements.slice(0, 2).join('; ')}` : null,
      ].filter(Boolean).join('\n\n');

      Alert.alert(`AI resume score: ${review.score}/100`, feedback, [
        { text: 'Fix with AI', onPress: () => fixImported(data.resume.id) },
        { text: 'Open imported resume', onPress: () => navigation.navigate('Editor', { resumeId: data.resume.id }) },
        { text: 'Close', style: 'cancel' },
      ]);
    } catch (err) {
      Alert.alert('Could not import resume', err.response?.data?.error || 'Check your connection and try again.');
    } finally {
      setImporting(false);
    }
  }

  async function fixImported(id) {
    setImporting(true);
    try {
      const { data } = await api.post(`/resumes/${id}/ai-fix`, null, { timeout: 120000 });
      setResumes((prev) => [data.resume, ...prev]);
      Alert.alert('Resume improved', 'Saved as a new copy. Your original is unchanged.', [
        { text: 'Open', onPress: () => navigation.navigate('Editor', { resumeId: data.resume.id }) },
        { text: 'Close', style: 'cancel' },
      ]);
    } catch (err) {
      Alert.alert('Could not improve resume', err.response?.data?.error || 'Check your connection and try again.');
    } finally {
      setImporting(false);
    }
  }

  async function removeResume(id) {
    Alert.alert('Delete resume', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/resumes/${id}`);
          setResumes((prev) => prev.filter((r) => r.id !== id));
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={typography.h1}>Your Resumes</Text>
        <Text style={[typography.caption, { marginTop: 4 }]}>
          {resumes.length} resume{resumes.length === 1 ? '' : 's'}
        </Text>
      </View>

      <TouchableOpacity style={styles.importButton} onPress={importResume} disabled={importing}>
        {importing ? <ActivityIndicator color={colors.accentAlt} /> : <Text style={styles.importText}>↑  Import PDF or Word resume</Text>}
      </TouchableOpacity>
      <Text style={[typography.caption, styles.importNote]}>
        PDF and DOCX files up to 10 MB. Resume text is sent to AI for scoring and saved to your account.
      </Text>

      <FlatList
        data={resumes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        ListEmptyComponent={
          !loading && (
            <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <Text style={typography.h3}>No resumes yet</Text>
              <Text style={[typography.caption, { marginTop: 6, textAlign: 'center' }]}>
                Tap "New Resume" below to build your first one with AI assistance.
              </Text>
            </Card>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('Editor', { resumeId: item.id })}>
            <Card style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={typography.h3}>{item.title}</Text>
                <Text style={[typography.caption, { marginTop: 4 }]}>
                  {TEMPLATE_LABEL[item.template] || item.template} · Edited{' '}
                  {new Date(item.updatedAt).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeResume(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </Card>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={createResume}>
        <Text style={styles.fabText}>+ New Resume</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center' },
  importButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accentAlt,
    backgroundColor: colors.surface,
  },
  importText: { color: colors.accentAlt, textAlign: 'center', fontWeight: '700' },
  importNote: { marginHorizontal: spacing.lg, marginTop: 6 },
  deleteText: { color: colors.danger, fontWeight: '600', fontSize: 13 },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 16,
  },
  fabText: { color: colors.white, textAlign: 'center', fontWeight: '700', fontSize: 15 },
});
