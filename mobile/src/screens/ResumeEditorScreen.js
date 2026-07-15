import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import api from '../services/api';
import { Card, SectionHeader } from '../components/Card';
import LabeledInput from '../components/LabeledInput';
import AIAssistButton from '../components/AIAssistButton';
import { colors, spacing, radius, typography } from '../theme/tokens';
import { emptyExperience, emptyEducation, emptyProject } from '../templates/resumeData';

export default function ResumeEditorScreen({ route, navigation }) {
  const { resumeId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState('modern');
  const [content, setContent] = useState(null);
  const [aiBusy, setAiBusy] = useState(null); // tracks which AI action is running

  useEffect(() => {
    (async () => {
      const { data } = await api.get(`/resumes/${resumeId}`);
      setTitle(data.title);
      setTemplate(data.template);
      setContent(data.content);
      setLoading(false);
    })();
  }, [resumeId]);

  const save = useCallback(
    async (silent = false) => {
      setSaving(true);
      try {
        await api.put(`/resumes/${resumeId}`, { title, template, content });
      } catch {
        if (!silent) Alert.alert('Error', 'Could not save changes');
      } finally {
        setSaving(false);
      }
    },
    [resumeId, title, template, content]
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => save(false)} style={{ marginRight: 12 }}>
          <Text style={{ color: colors.accentAlt, fontWeight: '700' }}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, save, saving]);

  if (loading || !content) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  function updatePersonalInfo(field, value) {
    setContent((c) => ({ ...c, personalInfo: { ...c.personalInfo, [field]: value } }));
  }

  async function handleGenerateSummary() {
    setAiBusy('summary');
    try {
      const { data } = await api.post('/ai/summary', {
        role: content.personalInfo.title || 'professional',
        yearsExperience: content.experience.length ? content.experience.length * 2 : 3,
        keySkills: content.skills.join(', ') || 'general professional skills',
      });
      setContent((c) => ({ ...c, summary: data.summary }));
    } catch {
      Alert.alert('AI unavailable', 'Could not generate summary right now.');
    } finally {
      setAiBusy(null);
    }
  }

  function addExperience() {
    setContent((c) => ({ ...c, experience: [...c.experience, emptyExperience()] }));
  }
  function updateExperience(id, field, value) {
    setContent((c) => ({
      ...c,
      experience: c.experience.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    }));
  }
  function updateBullet(expId, index, value) {
    setContent((c) => ({
      ...c,
      experience: c.experience.map((e) =>
        e.id === expId ? { ...e, bullets: e.bullets.map((b, i) => (i === index ? value : b)) } : e
      ),
    }));
  }
  function addBullet(expId) {
    setContent((c) => ({
      ...c,
      experience: c.experience.map((e) => (e.id === expId ? { ...e, bullets: [...e.bullets, ''] } : e)),
    }));
  }
  function removeExperience(id) {
    setContent((c) => ({ ...c, experience: c.experience.filter((e) => e.id !== id) }));
  }

  async function handleImproveBullet(expId, index, jobTitle) {
    const exp = content.experience.find((e) => e.id === expId);
    const bulletText = exp.bullets[index];
    if (!bulletText) return Alert.alert('Nothing to improve', 'Write a rough bullet point first.');
    setAiBusy(`bullet-${expId}-${index}`);
    try {
      const { data } = await api.post('/ai/improve-bullet', { bulletText, jobTitle });
      updateBullet(expId, index, data.improved);
    } catch {
      Alert.alert('AI unavailable', 'Could not improve this bullet right now.');
    } finally {
      setAiBusy(null);
    }
  }

  function addEducation() {
    setContent((c) => ({ ...c, education: [...c.education, emptyEducation()] }));
  }
  function updateEducation(id, field, value) {
    setContent((c) => ({
      ...c,
      education: c.education.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    }));
  }
  function removeEducation(id) {
    setContent((c) => ({ ...c, education: c.education.filter((e) => e.id !== id) }));
  }

  function addProject() {
    setContent((c) => ({ ...c, projects: [...c.projects, emptyProject()] }));
  }
  function updateProject(id, field, value) {
    setContent((c) => ({
      ...c,
      projects: c.projects.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    }));
  }
  function removeProject(id) {
    setContent((c) => ({ ...c, projects: c.projects.filter((p) => p.id !== id) }));
  }

  async function handleSuggestSkills() {
    setAiBusy('skills');
    try {
      const { data } = await api.post('/ai/suggest-skills', {
        jobTitle: content.personalInfo.title || 'professional',
        existingSkills: content.skills.join(', '),
      });
      setContent((c) => ({ ...c, skills: [...new Set([...c.skills, ...data.skills])] }));
    } catch {
      Alert.alert('AI unavailable', 'Could not suggest skills right now.');
    } finally {
      setAiBusy(null);
    }
  }
  function removeSkill(skill) {
    setContent((c) => ({ ...c, skills: c.skills.filter((s) => s !== skill) }));
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
      <LabeledInput label="Resume title" value={title} onChangeText={setTitle} placeholder="e.g. Product Manager Resume" />

      <View style={styles.templateRow}>
        {['modern', 'classic'].map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTemplate(t)}
            style={[styles.templateChip, template === t && styles.templateChipActive]}
          >
            <Text style={[styles.templateChipText, template === t && styles.templateChipTextActive]}>
              {t === 'modern' ? 'Modern' : 'Classic'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Card>
        <SectionHeader title="Personal Info" />
        <LabeledInput label="Full name" value={content.personalInfo.fullName} onChangeText={(v) => updatePersonalInfo('fullName', v)} />
        <LabeledInput label="Target role / title" value={content.personalInfo.title} onChangeText={(v) => updatePersonalInfo('title', v)} placeholder="e.g. Senior Software Engineer" />
        <LabeledInput label="Email" value={content.personalInfo.email} onChangeText={(v) => updatePersonalInfo('email', v)} keyboardType="email-address" autoCapitalize="none" />
        <LabeledInput label="Phone" value={content.personalInfo.phone} onChangeText={(v) => updatePersonalInfo('phone', v)} keyboardType="phone-pad" />
        <LabeledInput label="Location" value={content.personalInfo.location} onChangeText={(v) => updatePersonalInfo('location', v)} placeholder="City, Country" />
        <LabeledInput label="LinkedIn / portfolio" value={content.personalInfo.linkedin} onChangeText={(v) => updatePersonalInfo('linkedin', v)} autoCapitalize="none" />
      </Card>

      <Card>
        <SectionHeader title="Summary" subtitle="A 3-4 sentence pitch at the top of your resume" />
        <LabeledInput multiline value={content.summary} onChangeText={(v) => setContent((c) => ({ ...c, summary: v }))} placeholder="Write a rough draft, or let AI generate one from your info below" />
        <AIAssistButton label="Generate with AI" onPress={handleGenerateSummary} loading={aiBusy === 'summary'} />
      </Card>

      <Card>
        <SectionHeader title="Experience" />
        {content.experience.map((exp) => (
          <View key={exp.id} style={styles.subCard}>
            <View style={styles.subCardHeader}>
              <Text style={typography.h3}>{exp.jobTitle || 'New role'}</Text>
              <TouchableOpacity onPress={() => removeExperience(exp.id)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
            <LabeledInput label="Job title" value={exp.jobTitle} onChangeText={(v) => updateExperience(exp.id, 'jobTitle', v)} />
            <LabeledInput label="Company" value={exp.company} onChangeText={(v) => updateExperience(exp.id, 'company', v)} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <LabeledInput label="Start date" value={exp.startDate} onChangeText={(v) => updateExperience(exp.id, 'startDate', v)} placeholder="Jan 2022" />
              </View>
              <View style={{ flex: 1 }}>
                <LabeledInput label="End date" value={exp.endDate} onChangeText={(v) => updateExperience(exp.id, 'endDate', v)} placeholder="Present" />
              </View>
            </View>
            <Text style={[typography.label, { marginTop: spacing.sm, marginBottom: 6 }]}>BULLET POINTS</Text>
            {exp.bullets.map((bullet, i) => (
              <View key={i} style={{ marginBottom: 6 }}>
                <LabeledInput
                  multiline
                  value={bullet}
                  onChangeText={(v) => updateBullet(exp.id, i, v)}
                  placeholder="e.g. Led a team of 4 engineers to ship a new feature"
                />
                <AIAssistButton
                  label="Improve wording"
                  onPress={() => handleImproveBullet(exp.id, i, exp.jobTitle)}
                  loading={aiBusy === `bullet-${exp.id}-${i}`}
                />
              </View>
            ))}
            <TouchableOpacity onPress={() => addBullet(exp.id)}>
              <Text style={styles.addLinkText}>+ Add bullet point</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addSectionBtn} onPress={addExperience}>
          <Text style={styles.addSectionText}>+ Add work experience</Text>
        </TouchableOpacity>
      </Card>

      <Card>
        <SectionHeader title="Education" />
        {content.education.map((edu) => (
          <View key={edu.id} style={styles.subCard}>
            <View style={styles.subCardHeader}>
              <Text style={typography.h3}>{edu.school || 'New school'}</Text>
              <TouchableOpacity onPress={() => removeEducation(edu.id)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
            <LabeledInput label="School" value={edu.school} onChangeText={(v) => updateEducation(edu.id, 'school', v)} />
            <LabeledInput label="Degree" value={edu.degree} onChangeText={(v) => updateEducation(edu.id, 'degree', v)} placeholder="B.Sc, MBA, etc." />
            <LabeledInput label="Field of study" value={edu.field} onChangeText={(v) => updateEducation(edu.id, 'field', v)} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <LabeledInput label="Start date" value={edu.startDate} onChangeText={(v) => updateEducation(edu.id, 'startDate', v)} />
              </View>
              <View style={{ flex: 1 }}>
                <LabeledInput label="End date" value={edu.endDate} onChangeText={(v) => updateEducation(edu.id, 'endDate', v)} />
              </View>
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.addSectionBtn} onPress={addEducation}>
          <Text style={styles.addSectionText}>+ Add education</Text>
        </TouchableOpacity>
      </Card>

      <Card>
        <SectionHeader title="Skills" />
        <View style={styles.skillsWrap}>
          {content.skills.map((skill) => (
            <TouchableOpacity key={skill} style={styles.skillPill} onPress={() => removeSkill(skill)}>
              <Text style={styles.skillPillText}>{skill} ✕</Text>
            </TouchableOpacity>
          ))}
        </View>
        <AIAssistButton label="Suggest skills with AI" onPress={handleSuggestSkills} loading={aiBusy === 'skills'} />
      </Card>

      <Card>
        <SectionHeader title="Projects" subtitle="Optional — good for portfolios or career changers" />
        {content.projects.map((p) => (
          <View key={p.id} style={styles.subCard}>
            <View style={styles.subCardHeader}>
              <Text style={typography.h3}>{p.name || 'New project'}</Text>
              <TouchableOpacity onPress={() => removeProject(p.id)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
            <LabeledInput label="Project name" value={p.name} onChangeText={(v) => updateProject(p.id, 'name', v)} />
            <LabeledInput multiline label="Description" value={p.description} onChangeText={(v) => updateProject(p.id, 'description', v)} />
          </View>
        ))}
        <TouchableOpacity style={styles.addSectionBtn} onPress={addProject}>
          <Text style={styles.addSectionText}>+ Add project</Text>
        </TouchableOpacity>
      </Card>

      <TouchableOpacity
        style={styles.previewBtn}
        onPress={async () => {
          await save(true);
          navigation.navigate('Preview', { resumeId });
        }}
      >
        <Text style={styles.previewBtnText}>Preview & Export PDF</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  templateRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  templateChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  templateChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  templateChipText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  templateChipTextActive: { color: colors.white },
  subCard: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.md,
  },
  subCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  removeText: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  addLinkText: { color: colors.accentAlt, fontSize: 13, fontWeight: '600', marginTop: 4 },
  addSectionBtn: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addSectionText: { color: colors.accent, fontWeight: '600', fontSize: 13 },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  skillPill: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skillPillText: { color: colors.textPrimary, fontSize: 12, fontWeight: '500' },
  previewBtn: { backgroundColor: colors.accent, borderRadius: radius.md, padding: 16, marginTop: spacing.md },
  previewBtnText: { color: colors.white, textAlign: 'center', fontWeight: '700', fontSize: 15 },
});
