// app/utils/api.js
// ✅ 使用 legacy 版 API，就不會再被 Expo 擋下 readAsStringAsync
import * as FileSystem from 'expo-file-system/legacy';

// 你的 FastAPI Render 後端網址
const API_BASE_URL = 'https://emogo-backend-kylelaiii.onrender.com';

/**
 * 讀取文件為 Base64
 */
async function readFileAsBase64(filePath) {
  // 直接用 legacy API，encoding 用字串 'base64'
  const content = await FileSystem.readAsStringAsync(filePath, {
    encoding: 'base64',
  });
  console.log(
    '[readFileAsBase64] 讀取成功:',
    filePath,
    '大小:',
    Math.round(content.length / 1024),
    'KB'
  );
  return content;
}

/**
 * 上傳單筆紀錄（包含視頻）到雲端
 */
export async function uploadRecordToCloud(record) {
  try {
    if (!record.videoPath) {
      throw new Error('缺少視頻路徑');
    }

    console.log('[uploadRecordToCloud] 開始讀取視頻文件:', record.videoPath);

    const base64Video = await readFileAsBase64(record.videoPath);
    console.log(
      '[uploadRecordToCloud] 視頻讀取成功, 大小:',
      Math.round(base64Video.length / 1024),
      'KB'
    );

    const uploadPayload = {
      exportDate: new Date().toISOString(),
      recordCount: 1,
      records: [
        {
          id: record.id,
          sentiment: record.sentiment,
          sentimentValue: record.sentimentValue,
          latitude: record.latitude,
          longitude: record.longitude,
          timestamp: record.timestamp,
          videoPath: record.videoPath || '',
          videoBase64: base64Video, // ✅ 把 mp4 轉成 base64 一起丟到後端
        },
      ],
    };

    console.log('[uploadRecordToCloud] 開始上傳到後端.');
    const response = await fetch(`${API_BASE_URL}/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(uploadPayload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Server responded ${response.status}: ${text}`);
    }

    const result = await response.json();
    console.log('[uploadRecordToCloud] 上傳成功:', result);
    return result;
  } catch (error) {
    console.error('[uploadRecordToCloud] 上傳錯誤:', error);
    throw error;
  }
}

/**
 * 批量上傳多筆紀錄到雲端（如果之後要用）
 */
export async function uploadMultipleRecordsToCloud(records) {
  try {
    const uploadRecords = [];

    for (const record of records) {
      if (!record.videoPath) {
        console.warn(`Record ${record.id} missing videoPath, skipping video`);
        uploadRecords.push({
          id: record.id,
          sentiment: record.sentiment,
          sentimentValue: record.sentimentValue,
          latitude: record.latitude,
          longitude: record.longitude,
          timestamp: record.timestamp,
          videoPath: record.videoPath || '',
          videoBase64: null,
        });
        continue;
      }

      try {
        const base64Video = await readFileAsBase64(record.videoPath);
        uploadRecords.push({
          id: record.id,
          sentiment: record.sentiment,
          sentimentValue: record.sentimentValue,
          latitude: record.latitude,
          longitude: record.longitude,
          timestamp: record.timestamp,
          videoPath: record.videoPath || '',
          videoBase64: base64Video,
        });
      } catch (e) {
        console.warn(`無法讀取紀錄 ${record.id} 的視頻:`, e.message);
        uploadRecords.push({
          id: record.id,
          sentiment: record.sentiment,
          sentimentValue: record.sentimentValue,
          latitude: record.latitude,
          longitude: record.longitude,
          timestamp: record.timestamp,
          videoPath: record.videoPath || '',
          videoBase64: null,
        });
      }
    }

    const uploadPayload = {
      exportDate: new Date().toISOString(),
      recordCount: uploadRecords.length,
      records: uploadRecords,
    };

    const response = await fetch(`${API_BASE_URL}/records/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(uploadPayload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Server responded ${response.status}: ${text}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Batch upload error:', error);
    throw error;
  }
}

/**
 * 從雲端下載所有紀錄（CSV 或 JSON）
 * @param {string} format - 'csv' 或 'json'
 * @returns {Promise<Blob>} 返回文件 Blob
 */
export async function downloadExportFromCloud(format = 'json') {
  try {
    const response = await fetch(`${API_BASE_URL}/export?format=${format}`);

    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

/**
 * 從雲端下載單個紀錄的視頻
 * @param {string|number} recordId - 紀錄 ID
 * @returns {Promise<Blob>} 返回視頻文件 Blob
 */
export async function downloadVideoFromCloud(recordId) {
  try {
    const response = await fetch(`${API_BASE_URL}/records/${recordId}/video`);

    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('Video download error:', error);
    throw error;
  }
}

/**
 * 同步本機所有紀錄到雲端
 * @param {Array} localRecords - 本機紀錄陣列
 * @returns {Promise} 返回同步結果
 */
export async function syncAllRecordsToCloud(localRecords) {
  try {
    if (localRecords.length === 0) {
      return { message: '沒有紀錄需要同步', syncedCount: 0 };
    }

    const uploadRecords = [];

    for (const record of localRecords) {
      let videoBase64 = null;

      if (record.videoPath) {
        try {
          console.log(`[syncAllRecordsToCloud] 讀取視頻: ${record.id}`);
          videoBase64 = await readFileAsBase64(record.videoPath);
          console.log(`[syncAllRecordsToCloud] 視頻讀取成功: ${record.id}`);
        } catch (e) {
          console.warn(`無法讀取紀錄 ${record.id} 的視頻:`, e.message);
        }
      }

      uploadRecords.push({
        id: record.id,
        sentiment: record.sentiment || 'unknown',
        sentimentValue: record.sentimentValue || 0,
        latitude: record.latitude,
        longitude: record.longitude,
        timestamp: record.timestamp,
        createdAt: record.createdAt,
        videoPath: record.videoPath || '',
        videoBase64,
      });
    }

    const syncPayload = {
      exportDate: new Date().toISOString(),
      recordCount: uploadRecords.length,
      records: uploadRecords,
    };

    console.log(
      `[syncAllRecordsToCloud] 開始同步 ${uploadRecords.length} 筆紀錄`
    );
    const response = await fetch(`${API_BASE_URL}/records/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(syncPayload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Sync failed: ${response.status} - ${text}`);
    }

    const result = await response.json();
    console.log('[syncAllRecordsToCloud] 同步成功:', result);
    return {
      message: '同步成功',
      syncedCount: uploadRecords.length,
      result,
    };
  } catch (error) {
    console.error('[syncAllRecordsToCloud] 同步錯誤:', error);
    throw error;
  }
}
