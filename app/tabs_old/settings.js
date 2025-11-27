import React from 'react';
import { View, Text } from 'react-native';

export default function SettingsScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Settings</Text>
      <Text style={{ fontSize: 14, color: '#666', marginTop: 10 }}>Coming soon...</Text>
    </View>
  );
}
