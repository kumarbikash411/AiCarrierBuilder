import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import api from '../services/api';
import { Card, SectionHeader } from '../components/Card';
import LabeledInput from '../components/LabeledInput';
import { renderTemplate } from '../templates';
import { colors, radius, spacing, typography } from '../theme/tokens';

const SITES = [
  { name: 'LinkedIn', host: 'linkedin.com/jobs/search/?keywords=' },
  { name: 'Naukri', host: 'naukri.com/' },
  { name: 'Indeed', host: 'indeed.com/jobs?q=' },
];
const STATUS = {
  SAVED: 'Saved',
  APPLIED: 'Applied',
  INTERVIEWING: 'Interviewing',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
};

function normaliseUrl(url) {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default function JobSearchScreen() {
  const [query, setQuery] = useState('');
  const [applications, setApplications] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [applicationUrl, setApplicationUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [applicationResponse, resumeResponse] = await Promise.all([api.get('/applications'), api.get('/resumes')]);
      setApplications(applicationResponse.data);
      setResumes(resumeResponse.data);
      if (!selectedResumeId && resumeResponse.data.length) setSelectedResumeId(resumeResponse.data[0].id);
    } catch {
      Alert.alert('Could not load jobs', 'Please check your internet connection and try again.');
    }
  }, [selectedResumeId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function search(site) {
    const keywords = query.trim() || 'jobs';
    const url = site.name === 'Naukri'
      ? `https://www.naukri.com/${encodeURIComponent(keywords).replace(/%20/g, '-')}-jobs`
      : `https://www.${site.host}${encodeURIComponent(keywords)}`;
    await Linking.openURL(url);
  }

  async function saveApplication() {
    if (!company.trim() || !role.trim()) return Alert.alert('Enter the company and role');
    setSaving(true);
    try {
      const { data } = await api.post('/applications', {
        company: company.trim(), role: role.trim(), location: location.trim() || null,
        applicationUrl: normaliseUrl(applicationUrl.trim()), notes: notes.trim() || null,
        submittedResumeId: selectedResumeId,
      });
      setApplications((items) => [data, ...items]);
      setCompany(''); setRole(''); setLocation(''); setApplicationUrl(''); setNotes('');
    } catch (err) {
      Alert.alert('Could not save application', err.response?.data?.error || 'Please try again.');
    } finally { setSaving(false); }
  }

  async function updateApplication(id, data) {
    try {
      const response = await api.put(`/applications/${id}`, data);
      setApplications((items) => items.map((item) => item.id === id ? response.data : item));
    } catch (err) { Alert.alert('Could not update application', err.response?.data?.error || 'Please try again.'); }
  }

  function markApplied(application) {
    updateApplication(application.id, { status: 'APPLIED', appliedAt: new Date().toISOString() });
  }

  function remove(application) {
    Alert.alert('Remove application', `Remove ${application.role} at ${application.company}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await api.delete(`/applications/${application.id}`); setApplications((items) => items.filter((item) => item.id !== application.id)); }
        catch { Alert.alert('Could not remove application'); }
      } },
    ]);
  }

  async function shareResume(resumeId) {
    if (!resumeId) return Alert.alert('Create a resume first', 'You can select it here before applying.');
    try {
      const { data } = await api.get(`/resumes/${resumeId}`);
      const { uri } = await Print.printToFileAsync({ html: renderTemplate(data.template, data.content) });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share resume' });
      else Alert.alert('Resume ready', uri);
    } catch { Alert.alert('Could not prepare resume', 'Please try again.'); }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionHeader title="Find & Track Jobs" subtitle="Search job boards, save each opportunity, and apply with your resume." />

      <Card>
        <Text style={[typography.label, { marginBottom: 8 }]}>SEARCH JOB BOARDS</Text>
        <LabeledInput label="Role or keywords" value={query} onChangeText={setQuery} placeholder="e.g. React Native developer" />
        <View style={styles.siteRow}>
          {SITES.map((site) => <TouchableOpacity key={site.name} style={styles.outlineBtn} onPress={() => search(site)}><Text style={styles.outlineText}>{site.name}</Text></TouchableOpacity>)}
        </View>
      </Card>

      <Card>
        <SectionHeader title="Save an application" subtitle="Add a job after you find it, then keep its progress in one place." />
        <LabeledInput label="Company" value={company} onChangeText={setCompany} placeholder="Company name" />
        <LabeledInput label="Role" value={role} onChangeText={setRole} placeholder="e.g. Product Manager" />
        <LabeledInput label="Location (optional)" value={location} onChangeText={setLocation} placeholder="Remote, Bengaluru..." />
        <LabeledInput label="Application link (optional)" value={applicationUrl} onChangeText={setApplicationUrl} placeholder="https://company.com/careers/job" autoCapitalize="none" />
        <LabeledInput label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="Referral, deadline, recruiter contact..." />
        <Text style={[typography.label, { marginBottom: 8 }]}>RESUME TO SUBMIT</Text>
        <View style={styles.resumeRow}>
          {resumes.map((resume) => <TouchableOpacity key={resume.id} onPress={() => setSelectedResumeId(resume.id)} style={[styles.resumeChip, selectedResumeId === resume.id && styles.resumeChipActive]}><Text style={[styles.resumeText, selectedResumeId === resume.id && styles.resumeTextActive]}>{resume.title}</Text></TouchableOpacity>)}
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={saveApplication} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Save application</Text>}
        </TouchableOpacity>
      </Card>

      <SectionHeader title="Your applications" subtitle={`${applications.length} saved`} />
      {applications.map((application) => (
        <Card key={application.id}>
          <View style={styles.applicationHeader}>
            <View style={{ flex: 1 }}><Text style={typography.h3}>{application.role}</Text><Text style={[typography.caption, { marginTop: 3 }]}>{application.company}{application.location ? ` · ${application.location}` : ''}</Text></View>
            <Text style={[styles.status, application.status === 'REJECTED' && styles.rejected, application.status === 'OFFER' && styles.offer]}>{STATUS[application.status]}</Text>
          </View>
          {application.notes ? <Text style={[typography.caption, { marginBottom: spacing.sm }]}>{application.notes}</Text> : null}
          <View style={styles.actionRow}>
            {application.applicationUrl ? <TouchableOpacity style={styles.outlineBtn} onPress={() => Linking.openURL(application.applicationUrl)}><Text style={styles.outlineText}>Open & Apply</Text></TouchableOpacity> : null}
            <TouchableOpacity style={styles.outlineBtn} onPress={() => shareResume(application.submittedResumeId)}><Text style={styles.outlineText}>Share Resume</Text></TouchableOpacity>
            {application.status === 'SAVED' ? <TouchableOpacity style={styles.outlineBtn} onPress={() => markApplied(application)}><Text style={styles.outlineText}>Mark Applied</Text></TouchableOpacity> : null}
          </View>
          <TouchableOpacity onPress={() => remove(application)}><Text style={styles.removeText}>Remove</Text></TouchableOpacity>
        </Card>
      ))}
      {!applications.length && <Text style={[typography.caption, { textAlign: 'center', marginBottom: spacing.xl }]}>Your saved job applications will appear here.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg }, content: { padding: spacing.lg, paddingBottom: 60 },
  siteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, resumeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  outlineBtn: { borderWidth: 1, borderColor: colors.accentAlt, borderRadius: radius.sm, paddingVertical: 9, paddingHorizontal: 11 }, outlineText: { color: colors.accentAlt, fontSize: 12, fontWeight: '700' },
  primaryBtn: { backgroundColor: colors.accent, borderRadius: radius.md, padding: 14, marginTop: spacing.sm }, primaryText: { color: colors.white, textAlign: 'center', fontWeight: '700' },
  resumeChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 10 }, resumeChipActive: { borderColor: colors.accent, backgroundColor: colors.accent }, resumeText: { color: colors.textSecondary, fontSize: 12 }, resumeTextActive: { color: colors.white, fontWeight: '700' },
  applicationHeader: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }, status: { alignSelf: 'flex-start', color: colors.accentAlt, backgroundColor: `${colors.accentAlt}22`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, fontSize: 11, fontWeight: '700' }, rejected: { color: colors.danger, backgroundColor: `${colors.danger}22` }, offer: { color: colors.success, backgroundColor: `${colors.success}22` },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm, marginBottom: spacing.md }, removeText: { color: colors.danger, fontSize: 12, fontWeight: '600' },
});
