import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import LikertScale from '../components/LikertScale';
import VideoRecorder from '../components/VideoRecorder';
import RecordsList from '../components/RecordsList';
import { initDatabase, saveRecord, getAllRecords } from '../utils/db';
import { getCurrentLocation } from '../utils/location';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const SENTIMENT_LABELS = {
  1: '非常差',
  2: '較差',
  3: '一般',
  4: '較好',
  5: '非常好',
};

export default function HomeScreen() {
  const [selectedSentiment, setSelectedSentiment] = useState(null);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showRecordsList, setShowRecordsList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [videoUri, setVideoUri] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    initDatabase();
  }, []);

  const handleVideoSaved = async (uri) => {
    if (!selectedSentiment) {
      Alert.alert('錯誤', '請先選擇情緒狀態');
      return;
    }

    try {
      // ✅ 確保資料庫已經初始化成功（若已初始化，initDatabase 會直接 return 現有的 db）
      await initDatabase();

      const location = await getCurrentLocation();

      await saveRecord(
        uri,
        selectedSentiment,
        location?.latitude,
        location?.longitude
      );

      Alert.alert('成功', '紀錄已保存');
      setVideoUri(uri);
      setShowVideoRecorder(false);
      setSelectedSentiment(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      Alert.alert('錯誤', '保存紀錄失敗: ' + error.message);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const records = await getAllRecords();

      if (records.length === 0) {
        Alert.alert('提示', '沒有紀錄可以導出');
        setIsExporting(false);
        return;
      }

      // Create export data structure
      const exportData = {
        exportDate: new Date().toISOString(),
        recordCount: records.length,
        records: records.map(record => ({
          id: record.id,
          sentiment: SENTIMENT_LABELS[record.sentiment] || '未知',
          sentimentValue: record.sentiment,
          latitude: record.latitude,
          longitude: record.longitude,
          timestamp: new Date(record.timestamp).toISOString(),
          videoPath: record.videoPath,
        })),
      };

      // Create JSON file
      const dataDir = `${FileSystem.documentDirectory}data`;
      const dirInfo = await FileSystem.getInfoAsync(dataDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dataDir, { intermediates: true });
      }

      const fileName = `emogo_export_${new Date().getTime()}.json`;
      const filePath = `${dataDir}/${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(exportData, null, 2));

      // Also create a CSV file for easier viewing
      let csvContent = '序號,情緒,情緒值,經度,緯度,時間\n';
      records.forEach((record, index) => {
        csvContent += `${index + 1},"${SENTIMENT_LABELS[record.sentiment] || '未知'}",${record.sentiment},${record.longitude || ''},${record.latitude || ''},"${new Date(record.timestamp).toLocaleString('zh-TW')}"\n`;
      });

      const csvFileName = `emogo_export_${new Date().getTime()}.csv`;
      const csvFilePath = `${dataDir}/${csvFileName}`;
      await FileSystem.writeAsStringAsync(csvFilePath, csvContent);

      // Open share dialog
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: '導出 EmoGo 紀錄',
        });
      } else {
        Alert.alert('成功', `紀錄已導出到: ${filePath}\n\nJSON 文件: ${fileName}\nCSV 文件: ${csvFileName}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('錯誤', '導出失敗: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleError = (errorMessage) => {
    Alert.alert('錯誤', errorMessage);
  };

  if (showSettings) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowSettings(false)}>
            <Text style={styles.backButton}>← 返回</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>設定</Text>
        </View>
        <ScrollView style={styles.content}>
          <View style={styles.settingSection}>
            <Text style={styles.sectionTitle}>應用資訊</Text>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>應用名稱</Text>
              <Text style={styles.settingValue}>EmoGo</Text>
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>版本</Text>
              <Text style={styles.settingValue}>1.0.0</Text>
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>描述</Text>
              <Text style={styles.settingValue}>情緒與視頻紀錄應用</Text>
            </View>
          </View>

          <View style={styles.settingSection}>
            <Text style={styles.sectionTitle}>功能說明</Text>
            <Text style={styles.featureText}>1. 選擇你的情緒狀態（從非常差到非常好）</Text>
            <Text style={styles.featureText}>2. 錄製視頻紀錄你的想法</Text>
            <Text style={styles.featureText}>3. 應用將自動記錄你的經緯度位置</Text>
            <Text style={styles.featureText}>4. 查看紀錄查看所有保存的紀錄</Text>
            <Text style={styles.featureText}>5. 導出紀錄將所有數據導出為 JSON 或 CSV 格式</Text>
          </View>

          <View style={styles.settingSection}>
            <Text style={styles.sectionTitle}>數據存儲</Text>
            <Text style={styles.featureText}>所有紀錄（視頻、情緒、位置）都安全地存儲在設備本地</Text>
            <Text style={styles.featureText}>位置: {FileSystem.documentDirectory}data</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (showRecordsList) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowRecordsList(false)}>
            <Text style={styles.backButton}>← 返回</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>查看紀錄</Text>
        </View>
        <RecordsList refreshTrigger={refreshTrigger} />
      </View>
    );
  }

  if (showVideoRecorder) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowVideoRecorder(false)}>
            <Text style={styles.backButton}>← 返回</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>視頻錄製</Text>
          {selectedSentiment && (
            <Text style={styles.sentimentBadge}>情緒: {SENTIMENT_LABELS[selectedSentiment]}</Text>
          )}
        </View>
        {selectedSentiment ? (
          <VideoRecorder onVideoSaved={handleVideoSaved} onError={handleError} />
        ) : (
          <View style={styles.centerContent}>
            <Text style={styles.warningText}>請先在主頁面選擇情緒狀態</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>EmoGo</Text>
        <Text style={styles.subtitle}>記錄你的情緒與想法</Text>
        
        <LikertScale
          onSentimentChange={setSelectedSentiment}
          selectedSentiment={selectedSentiment}
        />

        {selectedSentiment && (
          <View style={styles.selectedSentimentCard}>
            <Text style={styles.selectedSentimentText}>
              ✓ 已選擇: {SENTIMENT_LABELS[selectedSentiment]}
            </Text>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]}
          onPress={() => setShowVideoRecorder(true)}
        >
          <Text style={styles.buttonText}>📹 視頻錄製</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={() => setShowRecordsList(true)}
        >
          <Text style={styles.buttonText}>📋 查看紀錄</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.successButton, isExporting && styles.disabledButton]}
          onPress={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>📤 導出紀錄</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.infoButton]}
          onPress={() => setShowSettings(true)}
        >
          <Text style={styles.buttonText}>⚙️ 設定</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4D96FF',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sentimentBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  selectedSentimentCard: {
    backgroundColor: '#4D96FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  selectedSentimentText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 50,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#FF6B6B',
  },
  secondaryButton: {
    backgroundColor: '#FFD93D',
  },
  successButton: {
    backgroundColor: '#6BCB77',
  },
  infoButton: {
    backgroundColor: '#667BC6',
  },
  disabledButton: {
    opacity: 0.6,
  },
  warningText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    fontWeight: '600',
  },
  settingSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#4D96FF',
    paddingBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  featureText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
});
