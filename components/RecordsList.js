import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { getAllRecords, deleteRecord } from '../utils/db';
import * as Sharing from 'expo-sharing';

const SENTIMENT_LABELS = {
  1: '非常差',
  2: '較差',
  3: '一般',
  4: '較好',
  5: '非常好',
};

const SENTIMENT_COLORS = {
  1: '#FF6B6B',
  2: '#FFA06B',
  3: '#FFD93D',
  4: '#6BCB77',
  5: '#4D96FF',
};

function RecordVideoPlayer({ uri }) {
  // 沒有影片就不要渲染
  if (!uri) return null;

  const player = useVideoPlayer(uri, (player) => {
    // 不一定要自動播放，這裡只做基本設定
    player.loop = false;
  });

  return (
    <VideoView
      player={player}
      style={styles.video}
      nativeControls
      allowsFullscreen
      allowsPictureInPicture
    />
  );
}

export default function RecordsList({ onRefresh, refreshTrigger }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    loadRecords();
  }, [refreshTrigger]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await getAllRecords();
      setRecords(data);
    } catch (error) {
      console.error('Error loading records:', error);
      Alert.alert('錯誤', '無法載入紀錄');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      '刪除紀錄',
      '確定要刪除此紀錄嗎？',
      [
        { text: '取消', onPress: () => {}, style: 'cancel' },
        {
          text: '刪除',
          onPress: async () => {
            try {
              await deleteRecord(id);
              loadRecords();
            } catch (error) {
              Alert.alert('錯誤', '刪除失敗');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleExportVideo = async (item) => {
    if (!item.videoPath) {
      Alert.alert('錯誤', '此紀錄沒有影片檔');
      return;
    }

    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('無法匯出', '此裝置不支援分享功能');
        return;
      }

      await Sharing.shareAsync(item.videoPath);
    } catch (error) {
      Alert.alert('錯誤', '匯出影片失敗：' + error.message);
    }
  };
  
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-TW');
  };

  const renderRecord = ({ item }) => (
    <View style={styles.recordCard}>
      <TouchableOpacity
        style={styles.recordHeader}
        onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
      >
        <View style={styles.recordInfo}>
          <Text style={styles.recordDate}>{formatDate(item.timestamp)}</Text>
          <View style={styles.sentimentBadge}>
            <View
              style={[
                styles.sentimentDot,
                { backgroundColor: SENTIMENT_COLORS[item.sentiment] },
              ]}
            />
            <Text style={styles.sentimentText}>
              {SENTIMENT_LABELS[item.sentiment]}
            </Text>
          </View>
        </View>
        <Text style={styles.expandIcon}>{expandedId === item.id ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {expandedId === item.id && (
        <View style={styles.expandedContent}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>位置：</Text>
            <Text style={styles.detailValue}>
              {item.latitude ? `${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}` : '無位置資訊'}
            </Text>
          </View>
          
          {item.videoPath && (
            <View style={styles.videoContainer}>
              <Text style={styles.videoLabel}>影片：</Text>
              <RecordVideoPlayer uri={item.videoPath} />

              <TouchableOpacity
                style={styles.exportButton}
                onPress={() => handleExportVideo(item)}
              >
                <Text style={styles.exportButtonText}>匯出影片</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id)}
          >
            <Text style={styles.deleteButtonText}>刪除紀錄</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4D96FF" />
      </View>
    );
  }

  if (records.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>還沒有紀錄</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={records}
      renderItem={renderRecord}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.listContainer}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  listContainer: {
    padding: 12,
    paddingBottom: 100,
  },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  recordInfo: {
    flex: 1,
  },
  recordDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sentimentDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  sentimentText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  expandIcon: {
    fontSize: 16,
    color: '#999',
    marginLeft: 12,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    width: 60,
  },
  detailValue: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  videoContainer: {
    marginTop: 12,
    marginBottom: 12,
  },
  videoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  video: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  exportButton: {
    backgroundColor: '#4D96FF',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
