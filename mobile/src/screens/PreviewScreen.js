import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import api from '../services/api';
import { renderTemplate } from '../templates';
import { colors, spacing, radius } from '../theme/tokens';

export default function PreviewScreen({ route }) {
  const { resumeId } = route.params;
  const [html, setHtml] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await api.get(`/resumes/${resumeId}`);
      setHtml(renderTemplate(data.template, data.content));
    })();
  }, [resumeId]);

  async function exportPdf() {
    setExporting(true);
    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share your resume' });
      } else {
        Alert.alert('PDF ready', `Saved to: ${uri}`);
      }
    } catch (err) {
      Alert.alert('Export failed', 'Could not generate the PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  if (!html) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView originWhitelist={['*']} source={{ html }} style={{ flex: 1, backgroundColor: '#fff' }} />
      <TouchableOpacity style={styles.exportBtn} onPress={exportPdf} disabled={exporting}>
        <Text style={styles.exportBtnText}>{exporting ? 'Preparing PDF…' : 'Export & Share PDF'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  exportBtn: { backgroundColor: colors.accent, padding: 16, margin: spacing.lg, borderRadius: radius.md },
  exportBtnText: { color: colors.white, textAlign: 'center', fontWeight: '700', fontSize: 15 },
});
