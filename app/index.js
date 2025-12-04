// app/index.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  SafeAreaView,
} from 'react-native';
import LikertScale from '../components/LikertScale';
import VideoRecorder from '../components/VideoRecorder';
import RecordsList from '../components/RecordsList';
import { initDatabase, saveRecord, getAllRecords } from '../utils/db';
import { getCurrentLocation } from '../utils/location';
import {
  uploadRecordToCloud,
  syncAllRecordsToCloud,
  downloadExportFromCloud,
} from '../utils/api';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import {
  requestNotificationPermission,
  initializeDefaultRemindersIfNeeded,
  addReminder,
  removeReminder,
  updateReminder,
  formatTime,
} from '../utils/reminders';

const SENTIMENT_LABELS = {
  1: '非常差',
  2: '較差',
  3: '一般',
  4: '較好',
  5: '非常好',
};

// 每天至少要有幾個提醒
const MIN_REMINDERS_PER_DAY = 3;

const initReminders = async () => {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert('提醒功能無法啟用', '請到系統設定開啟 EmoGo 的通知權限');
      setLoadingReminders(false);
      return;
    }
    const list = await initializeDefaultRemindersIfNeeded();
    setReminders(list);

    // 🔍 Debug：印出目前所有已排程的通知
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log('目前排程中的通知數量：', scheduled.length);
    console.log(JSON.stringify(scheduled, null, 2));
  } catch (e) {
    console.error('Init reminders error:', e);
    Alert.alert('錯誤', '初始化提醒設定失敗');
  } finally {
    setLoadingReminders(false);
  }
};

export default function HomeScreen() {
  const [selectedSentiment, setSelectedSentiment] = useState(null);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showRecordsList, setShowRecordsList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [videoUri, setVideoUri] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 提醒相關 state
  const [reminders, setReminders] = useState([]);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState('add');
  const [editingReminderId, setEditingReminderId] = useState(null); // 現在只有新增用途

  useEffect(() => {
    initDatabase();
    initReminders();
  }, []);

  const initReminders = async () => {
    try {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert('提醒功能無法啟用', '請到系統設定開啟 EmoGo 的通知權限');
        setLoadingReminders(false);
        return;
      }
      const list = await initializeDefaultRemindersIfNeeded();
      setReminders(list);
    } catch (e) {
      console.error('Init reminders error:', e);
      Alert.alert('錯誤', '初始化提醒設定失敗');
    } finally {
      setLoadingReminders(false);
    }
  };

  const handleVideoSaved = async (uri) => {
    if (!selectedSentiment) {
      Alert.alert('錯誤', '請先選擇情緒狀態');
      return;
    }

    try {
      await initDatabase();
      const location = await getCurrentLocation();

      const recordId = await saveRecord(
        uri,
        selectedSentiment,
        location?.latitude,
        location?.longitude
      );

      const timestampIso = new Date().toISOString();

      const cloudRecord = {
        id: recordId,
        sentiment: SENTIMENT_LABELS[selectedSentiment] || '未知',
        sentimentValue: selectedSentiment,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        timestamp: timestampIso,
        videoPath: uri,
      };

      try {
        await uploadRecordToCloud(cloudRecord);
        Alert.alert('成功', '紀錄已保存並上傳到雲端');
      } catch (cloudError) {
        console.error('Cloud upload failed:', cloudError);
        Alert.alert(
          '部分成功',
          '紀錄已儲存在本機，但上傳雲端失敗：' + cloudError.message
        );
      }

      setVideoUri(uri);
      setShowVideoRecorder(false);
      setSelectedSentiment(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      Alert.alert('錯誤', '保存本機紀錄失敗: ' + error.message);
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

      const exportData = {
        exportDate: new Date().toISOString(),
        recordCount: records.length,
        records: records.map((record) => ({
          id: record.id,
          sentiment: SENTIMENT_LABELS[record.sentiment] || '未知',
          sentimentValue: record.sentiment,
          latitude: record.latitude,
          longitude: record.longitude,
          timestamp: new Date(record.timestamp).toISOString(),
          videoPath: record.videoPath,
        })),
      };

      const dataDir = `${FileSystem.documentDirectory}data`;
      const dirInfo = await FileSystem.getInfoAsync(dataDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dataDir, { intermediates: true });
      }

      const fileName = `emogo_export_${new Date().getTime()}.json`;
      const filePath = `${dataDir}/${fileName}`;

      await FileSystem.writeAsStringAsync(
        filePath,
        JSON.stringify(exportData, null, 2)
      );

      let csvContent = '序號,情緒,情緒值,經度,緯度,時間\n';
      records.forEach((record, index) => {
        csvContent += `${index + 1},"${
          SENTIMENT_LABELS[record.sentiment] || '未知'
        }",${record.sentiment},${record.longitude || ''},${
          record.latitude || ''
        },"${new Date(record.timestamp).toLocaleString('zh-TW')}"\n`;
      });

      const csvFileName = `emogo_export_${new Date().getTime()}.csv`;
      const csvFilePath = `${dataDir}/${csvFileName}`;
      await FileSystem.writeAsStringAsync(csvFilePath, csvContent);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: '導出 EmoGo 紀錄',
        });
      } else {
        Alert.alert(
          '成功',
          `紀錄已導出到: ${filePath}\n\nJSON 文件: ${fileName}\nCSV 文件: ${csvFileName}`
        );
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('錯誤', '導出失敗: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSyncToCloud = async () => {
    try {
      setIsSyncing(true);
      const records = await getAllRecords();

      if (records.length === 0) {
        Alert.alert('提示', '沒有紀錄可以同步');
        return;
      }

      const formattedRecords = records.map((record) => ({
        id: record.id,
        sentiment: SENTIMENT_LABELS[record.sentiment] || '未知',
        sentimentValue: record.sentiment,
        latitude: record.latitude,
        longitude: record.longitude,
        timestamp: new Date(record.timestamp).toISOString(),
        createdAt: record.createdAt,
        videoPath: record.videoPath,
      }));

      const result = await syncAllRecordsToCloud(formattedRecords);

      Alert.alert('同步成功', `已同步 ${result.syncedCount} 筆紀錄到雲端`);
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('錯誤', '同步失敗: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // ===== 提醒相關 handler =====

  const handleAddReminder = () => {
    setTimePickerMode('add');
    setShowTimePicker(true);
  };

  const handleEditReminder = (reminder) => {
    setTimePickerMode('edit');
    setEditingReminderId(reminder.id);
    setShowTimePicker(true);
  };

  const onTimePicked = async (event, date) => {
    setShowTimePicker(false);
    if (event.type !== 'set' || !date) return;

    const hour = date.getHours();
    const minute = date.getMinutes();

    try {
      let updated;

      if (timePickerMode === 'edit' && editingReminderId) {
        // 修改既有提醒
        updated = await updateReminder(reminders, editingReminderId, hour, minute);
      } else {
        // 新增提醒
        updated = await addReminder(reminders, hour, minute);
      }

      setReminders(updated);
      setEditingReminderId(null);
    } catch (e) {
      console.error('Add / update reminder error:', e);
      Alert.alert('錯誤', timePickerMode === 'edit' ? '修改提醒失敗' : '新增提醒失敗');
    }
  };

  const handleDeleteReminder = async (id) => {
    if (reminders.length <= MIN_REMINDERS_PER_DAY) {
      Alert.alert(
        '無法刪除',
        `每天至少需要 ${MIN_REMINDERS_PER_DAY} 個提醒（預設 9:00 / 15:00 / 21:00）`
      );
      return;
    }

    try {
      const updated = await removeReminder(reminders, id);
      setReminders(updated);
    } catch (e) {
      console.error('Remove reminder error:', e);
      Alert.alert('錯誤', '刪除提醒失敗');
    }
  };

  const handleError = (errorMessage) => {
    Alert.alert('錯誤', errorMessage);
  };

  // ===== 不同畫面的切換 =====

  if (showSettings) {
    return (
      <SafeAreaView style={styles.safeArea}>
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
              <Text style={styles.featureText}>
                1. 選擇你的情緒狀態（從非常差到非常好）
              </Text>
              <Text style={styles.featureText}>2. 錄製視頻紀錄你的想法</Text>
              <Text style={styles.featureText}>3. 應用將自動記錄你的經緯度位置</Text>
              <Text style={styles.featureText}>4. 查看紀錄查看所有保存的紀錄</Text>
              <Text style={styles.featureText}>
                5. 導出紀錄將所有數據導出為 JSON 或 CSV 格式
              </Text>
            </View>

            <View style={styles.settingSection}>
              <Text style={styles.sectionTitle}>提醒設定</Text>
              {loadingReminders ? (
                <ActivityIndicator color="#4D96FF" />
              ) : (
                <>
                  {reminders.map((r, index) => (
                    <View key={r.id} style={styles.reminderItem}>
                      <Text style={styles.settingLabel}>提醒 {index + 1}</Text>

                      {/* 點時間可以修改那一個提醒 */}
                      <TouchableOpacity onPress={() => handleEditReminder(r)}>
                        <Text style={styles.settingValue}>{formatTime(r)}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDeleteReminder(r.id)}
                        disabled={reminders.length <= MIN_REMINDERS_PER_DAY}
                      >
                        <Text
                          style={[
                            styles.deleteReminderText,
                            reminders.length <= MIN_REMINDERS_PER_DAY &&
                              styles.disabledDeleteText,
                          ]}
                        >
                          刪除
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={handleAddReminder}
                  >
                    <Text style={styles.buttonText}>➕ 新增提醒</Text>
                  </TouchableOpacity>
                  <Text style={styles.helperText}>
                    * 每天至少保留 {MIN_REMINDERS_PER_DAY} 個提醒（預設為 9:00, 15:00,
                    21:00）。
                  </Text>
                </>
              )}
            </View>

            <View style={styles.settingSection}>
              <Text style={styles.sectionTitle}>數據存儲</Text>
              <Text style={styles.featureText}>
                所有紀錄（視頻、情緒、位置）都安全地存儲在設備本地
              </Text>
              <Text style={styles.featureText}>
                位置: {FileSystem.documentDirectory}data
              </Text>
            </View>
          </ScrollView>

          {showTimePicker && (
            <View style={styles.timePickerOverlay}>
              <View style={styles.timePickerContainer}>
                <Text style={styles.timePickerTitle}>
                  {timePickerMode === 'edit' ? '修改提醒時間' : '新增提醒時間'}
                </Text>

                <DateTimePicker
                  value={new Date()}
                  mode="time"
                  is24Hour
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimePicked}
                  style={styles.timePicker}
                />
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (showRecordsList) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowRecordsList(false)}>
              <Text style={styles.backButton}>← 返回</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>查看紀錄</Text>
          </View>
          <RecordsList refreshTrigger={refreshTrigger} />
        </View>
      </SafeAreaView>
    );
  }

  if (showVideoRecorder) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowVideoRecorder(false)}>
              <Text style={styles.backButton}>← 返回</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>視頻錄製</Text>
            {selectedSentiment && (
              <Text style={styles.sentimentBadge}>
                情緒: {SENTIMENT_LABELS[selectedSentiment]}
              </Text>
            )}
          </View>
          {selectedSentiment ? (
            <VideoRecorder onVideoSaved={handleVideoSaved} onError={handleError} />
          ) : (
            <View style={styles.centerContent}>
              <Text style={styles.warningText}>
                請先在主頁面選擇情緒狀態
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
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
            style={[
              styles.button,
              styles.successButton,
              isExporting && styles.disabledButton,
            ]}
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
            style={[
              styles.button,
              styles.warningButton,
              isSyncing && styles.disabledButton,
            ]}
            onPress={handleSyncToCloud}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>☁️ 同步到雲端</Text>
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
    </SafeAreaView>
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
  warningButton: {
    backgroundColor: '#FF9F43',
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
  // ===== 新增：提醒 UI 的樣式 =====
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  deleteReminderText: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '600',
  },
  disabledDeleteText: {
    color: '#ccc',
  },
  helperText: {
    marginTop: 8,
    fontSize: 12,
    color: '#888',
  },
  timePickerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '80%',
    maxWidth: 320,
    alignItems: 'center',
  },
  timePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  timePicker: {
    width: '100%',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#4D96FF', // 讓狀態列區域跟 header 一樣顏色
  },
});
