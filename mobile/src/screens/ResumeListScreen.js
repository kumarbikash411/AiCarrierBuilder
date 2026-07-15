import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { Card } from '../components/Card';
import { colors, spacing, radius, typography } from '../theme/tokens';
import { emptyResumeContent } from '../templates/resumeData';

const TEMPLATE_LABEL = { modern: 'Modern', classic: 'Classic', minimal: 'Minimal' };

export default function ResumeListScreen({ navigation }) {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);

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
