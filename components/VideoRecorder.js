import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraView, Camera, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';

const MINIMUM_VIDEO_DURATION = 1000; // 1 second in milliseconds

export default function VideoRecorder({ onVideoSaved, onError }) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [facing, setFacing] = useState('front');
  const [isSaving, setIsSaving] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const recordingStartTimeRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const handleCameraReady = () => {
    // 加一點點 delay，可以避開 iOS 上 from picture → video 模式時的 not ready bug
    setTimeout(() => {
      setIsCameraReady(true);
    }, 200);
  };

  // 相機權限
  useEffect(() => {
  if (!permission) return;
  if (!permission.granted) {
    requestPermission();
  }
  }, [permission, requestPermission]);

  // 麥克風權限（錄影需要）
  useEffect(() => {
    if (!micPermission) return;
    if (!micPermission.granted) {
      requestMicPermission();
    }
  }, [micPermission, requestMicPermission]);

  useEffect(() => {
    if (isRecording) {
      recordingStartTimeRef.current = Date.now();
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - recordingStartTimeRef.current;
        setRecordingTime(Math.floor(elapsed / 100) / 10); // Update every 100ms
      }, 100);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setRecordingTime(0);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
  // 避免連按造成多次呼叫 recordAsync
  if (isRecording) return;

  // 確認 ref / ready
  if (!cameraRef.current || !isCameraReady) {
    if (onError) onError('相機尚未準備好，請稍候...');
    return;
  }

  // 確認權限都有拿到
  if (!permission?.granted || !micPermission?.granted) {
    if (onError) onError('需要相機與麥克風權限才能錄影');
    return;
  }

  try {
    recordingStartTimeRef.current = Date.now();
    setIsRecording(true);

    const video = await cameraRef.current.recordAsync({
      maxDuration: 60, // 最長 60 秒
    });

    setIsRecording(false);

    const recordingDuration = Date.now() - recordingStartTimeRef.current;

    if (recordingDuration < MINIMUM_VIDEO_DURATION) {
      if (onError) onError('影片必須至少1秒長');
      return;
    }

    if (video && video.uri) {
      await saveVideoToDataDirectory(video.uri);
    }
  } catch (error) {
    console.error('Error recording video:', error);
    setIsRecording(false);
    if (onError) onError(error.message || '錄影失敗');
  }
};

  const saveVideoToDataDirectory = async (sourceUri) => {
    try {
      setIsSaving(true);

      // Ensure data directory exists
      const dataDir = `${FileSystem.documentDirectory}data`;
      const dirInfo = await FileSystem.getInfoAsync(dataDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dataDir, { intermediates: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `video_${timestamp}.mp4`;
      const destUri = `${dataDir}/${fileName}`;

      // Copy video to data directory
      await FileSystem.copyAsync({
        from: sourceUri,
        to: destUri,
      });

      console.log('Video saved to:', destUri);

      // Delete original temp file
      try {
        await FileSystem.deleteAsync(sourceUri);
      } catch (e) {
        console.warn('Could not delete temp video:', e.message);
      }

      setIsSaving(false);
      if (onVideoSaved) {
        onVideoSaved(destUri);
      }
    } catch (error) {
      console.error('Error saving video:', error);
      setIsSaving(false);
      if (onError) onError('保存視頻失敗: ' + error.message);
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current) return;

    try {
      await cameraRef.current.stopRecording();
      setIsRecording(false);
    } catch (error) {
      console.error('Error stopping recording:', error);
      if (onError) onError(error.message || '停止錄影失敗');
    }
  };

  if (!permission || !micPermission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4D96FF" />
      </View>
    );
  }

  if (!permission.granted || !micPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>需要相機與麥克風權限</Text>
        <Button
          title="授予權限"
          onPress={() => {
            requestPermission();
            requestMicPermission();
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        mode="video"          // ★ 一直維持在 video 模式
        onCameraReady={handleCameraReady}
      />
      
      <View style={styles.timerOverlay}>
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{recordingTime.toFixed(1)}秒</Text>
          {isRecording && <View style={styles.recordingIndicator} />}
        </View>
      </View>
      
      <View style={styles.buttonContainer}>
        {isSaving ? (
          <View style={styles.savingContainer}>
            <ActivityIndicator color="#4D96FF" />
            <Text style={styles.savingText}>保存中...</Text>
          </View>
        ) : !isRecording ? (
          <Button
            title="開始錄影"
            onPress={startRecording}
            color="#FF6B6B"
            disabled={!isCameraReady}
          />
        ) : (
          <>
            <Button
              title="停止錄影"
              onPress={stopRecording}
              color="#FF6B6B"
            />
            <Text style={styles.recordingText}>正在錄影中...</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 10,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  timerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 60,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  timerContainer: {
    alignItems: 'center',
  },
  timerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B6B',
    marginTop: 8,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  recordingText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingText: {
    color: '#4D96FF',
    fontSize: 14,
    marginLeft: 10,
    fontWeight: '600',
  },
  text: {
    color: '#fff',
    textAlign: 'center',
  },
});
