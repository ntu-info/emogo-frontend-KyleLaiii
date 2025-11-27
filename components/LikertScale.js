import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const SENTIMENT_OPTIONS = [
  { label: '非常差', value: 1, color: '#FF6B6B' },
  { label: '較差', value: 2, color: '#FFA06B' },
  { label: '一般', value: 3, color: '#FFD93D' },
  { label: '較好', value: 4, color: '#6BCB77' },
  { label: '非常好', value: 5, color: '#4D96FF' },
];

export default function LikertScale({ onSentimentChange, selectedSentiment }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>現在的情緒狀態</Text>
      <View style={styles.optionsContainer}>
        {SENTIMENT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              selectedSentiment === option.value && styles.selectedOption,
              { borderColor: option.color },
            ]}
            onPress={() => onSentimentChange(option.value)}
          >
            <View
              style={[
                styles.optionCircle,
                { backgroundColor: option.color },
                selectedSentiment === option.value && styles.selectedCircle,
              ]}
            />
            <Text style={styles.optionLabel}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 3,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  selectedOption: {
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
  },
  optionCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 6,
  },
  selectedCircle: {
    width: 36,
    height: 36,
  },
  optionLabel: {
    fontSize: 11,
    textAlign: 'center',
    color: '#333',
    fontWeight: '500',
  },
});
