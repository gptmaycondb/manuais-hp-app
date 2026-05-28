import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

const C = {
  bg: '#0d0f14', surface: '#161920', surface2: '#1e2230',
  border: '#2a2f3e', accent: '#0096ff', accent2: '#00d4aa',
  text: '#e4e8f0', dim: '#7a8299', muted: '#4a5168',
};

export default function DrawerContent({ manual, onQuestion }) {
  if (!manual) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: manual.color }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.modelName}>{manual.label}</Text>
          <Text style={styles.modelType}>{manual.subtitle}</Text>
        </View>
      </View>
      <View style={styles.tags}>
        {manual.tags.map(t => (
          <View key={t} style={[styles.tag, { borderColor: manual.color + '60' }]}>
            <Text style={[styles.tagText, { color: manual.color }]}>{t}</Text>
          </View>
        ))}
      </View>
      <ScrollView style={styles.topics} showsVerticalScrollIndicator={false}>
        {Object.entries(manual.topics).map(([section, questions]) => (
          <View key={section} style={styles.section}>
            <Text style={styles.sectionLabel}>{section}</Text>
            {questions.map((q, i) => (
              <TouchableOpacity key={i} style={styles.chip} onPress={() => onQuestion(q)}>
                <Text style={styles.chipText}>→ {q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.surface },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  dot: { width: 10, height: 10, borderRadius: 5 },
  modelName: { color: C.text, fontSize: 15, fontWeight: '700' },
  modelType: { color: C.dim, fontSize: 11, marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 16, paddingTop: 12 },
  tag: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontSize: 10, fontWeight: '600' },
  topics: { flex: 1 },
  section: { padding: 12, paddingTop: 8 },
  sectionLabel: { color: C.muted, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  chip: { paddingVertical: 9, paddingHorizontal: 10, borderRadius: 8, marginBottom: 2 },
  chipText: { color: C.dim, fontSize: 13, lineHeight: 18 },
});
