import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import LikertScale from '../../components/LikertScale';

export default function HomeScreen() {
  const [selectedSentiment, setSelectedSentiment] = useState(null);

  return (
    <View style={{ flex: 1, paddingTop: 20, backgroundColor: '#fff' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
          EmoGo
        </Text>
        
        <LikertScale
          onSentimentChange={setSelectedSentiment}
          selectedSentiment={selectedSentiment}
        />

        {selectedSentiment && (
          <View style={{ marginTop: 16, padding: 12, backgroundColor: '#e3f2fd', borderRadius: 4 }}>
            <Text style={{ textAlign: 'center', color: '#1565c0', fontWeight: '600' }}>
              選擇: {selectedSentiment}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}