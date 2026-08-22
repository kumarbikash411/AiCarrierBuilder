import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card, SectionHeader } from '../components/Card';
import { colors, radius, spacing, typography } from '../theme/tokens';

const OFFICIAL_ALERTS = [
  { name: 'IBPS updates', url: 'https://www.ibps.in/index.php/crp-updates/' },
  { name: 'SBI Careers', url: 'https://sbi.co.in/web/careers' },
  { name: 'SSC notices', url: 'https://ssc.gov.in/' },
  { name: 'UPSC recruitment', url: 'https://www.upsc.gov.in/recruitment/recruitment-advertisement' },
];

const BANK_TOPICS = [
  ['Quantitative aptitude', 'Simplification, number series, percentage, ratio, averages, profit & loss, time-work, DI.'],
  ['Reasoning', 'Puzzles, seating arrangement, syllogism, inequalities, coding-decoding, data sufficiency.'],
  ['English language', 'Reading comprehension, cloze test, error spotting, vocabulary and para-jumbles.'],
  ['General / banking awareness', 'Current affairs, RBI, banking terms, financial awareness and static GK.'],
  ['Computer aptitude', 'Internet, operating systems, MS Office, networking and cyber-security basics.'],
];

const GOVT_TOPICS = [
  ['SSC exams', 'Reasoning, general awareness, quantitative aptitude and English; practise previous-year papers.'],
  ['UPSC foundation', 'Polity, history, geography, economics, environment, science-tech and current affairs.'],
  ['Daily routine', 'Study concepts, solve timed questions, analyse mistakes, then revise short notes.'],
];

function TopicList({ topics }) {
  return topics.map(([title, detail]) => (
    <View key={title} style={styles.topic}>
      <Text style={typography.h3}>{title}</Text>
      <Text style={[typography.caption, { marginTop: 4, lineHeight: 18 }]}>{detail}</Text>
    </View>
 ));
}

export default function GovtPrepScreen() {
  async function openOfficialAlert(item) {
    try {
      await Linking.openURL(item.url);
    } catch {
      Alert.alert('Could not open website', 'Please try again later.');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionHeader title="Government & Bank Prep" subtitle="Prepare for competitive exams and check vacancies from official sources." />

      <Card>
        <SectionHeader title="Official vacancy alerts" subtitle="Always verify eligibility, dates and fees on the official notice before applying." />
        <View style={styles.alertGrid}>
          {OFFICIAL_ALERTS.map((item) => (
            <TouchableOpacity key={item.name} style={styles.alertButton} onPress={() => openOfficialAlert(item)}>
              <Text style={styles.alertText}>{item.name} ↗</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[typography.caption, { marginTop: spacing.md }]}>These links open the latest official notice boards; the app does not collect application fees or represent an exam authority.</Text>
      </Card>

      <Card>
        <SectionHeader title="Bank exam material" subtitle="Useful for IBPS PO/Clerk/RRB, SBI PO/Clerk and similar exams." />
        <TopicList topics={BANK_TOPICS} />
      </Card>

      <Card>
        <SectionHeader title="Government exam material" subtitle="Build a foundation for SSC, UPSC and other competitive examinations." />
        <TopicList topics={GOVT_TOPICS} />
      </Card>

      <Card>
        <SectionHeader title="A practical weekly plan" />
        <Text style={[typography.body, styles.plan]}>• Mon–Fri: 2 topic sessions + 30 timed questions{`\n`}• Saturday: one mock test under exam timing{`\n`}• Sunday: review errors, revise formulas and current affairs{`\n`}• Track accuracy first, then reduce time per question.</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 60 },
  alertGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  alertButton: { borderWidth: 1, borderColor: colors.accentAlt, borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 12 },
  alertText: { color: colors.accentAlt, fontSize: 12, fontWeight: '700' },
  topic: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, marginTop: spacing.md },
  plan: { lineHeight: 23 },
});
