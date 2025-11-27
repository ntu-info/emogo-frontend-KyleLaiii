import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DebugScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>EmoGo - 應用程式已啟動</Text>
      <Text style={styles.subtitle}>基礎功能正常</Text>
      <Text style={styles.info}>版本: 1.0.0</Text>
      <Text style={styles.info}>狀態: 開發中</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  info: {
    fontSize: 14,
    color: '#999',
    marginVertical: 5,
  },
});
