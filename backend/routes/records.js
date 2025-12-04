// backend/routes/records.js
const express = require('express');
const router = express.Router();
const Record = require('../models/Record');
const { uploadVideoToCloudinary, deleteVideoFromCloudinary } = require('../config/cloudinary');
const json2csv = require('json2csv').parse;

/**
 * POST /records
 * 上傳單筆紀錄（包含視頻）
 */
router.post('/', async (req, res) => {
  try {
    const { exportDate, recordCount, records } = req.body;

    if (!records || records.length === 0) {
      return res.status(400).json({ error: '缺少紀錄數據' });
    }

    const record = records[0];

    // 檢查紀錄是否已存在
    let dbRecord = await Record.findOne({ id: record.id });

    // 如果有視頻數據，上傳到 Cloudinary
    let videoUrl = null;
    let videoCloudinaryId = null;

    if (record.videoBase64) {
      try {
        const timestamp = Date.now();
        const filename = `video_${record.id}_${timestamp}.mp4`;
        const uploadResult = await uploadVideoToCloudinary(record.videoBase64, filename);
        videoUrl = uploadResult.secure_url;
        videoCloudinaryId = uploadResult.public_id;
        console.log(`✓ Video uploaded: ${filename}`);
      } catch (error) {
        console.error('Cloudinary upload error:', error);
        // 不中斷流程，只記錄錯誤
      }
    }

    // 準備保存的數據
    const recordData = {
      id: record.id,
      sentiment: record.sentiment,
      sentimentValue: record.sentimentValue,
      latitude: record.latitude,
      longitude: record.longitude,
      timestamp: record.timestamp,
      videoUrl: videoUrl,
      videoCloudinaryId: videoCloudinaryId,
      isUploaded: true,
    };

    // 更新或創建紀錄
    if (dbRecord) {
      // 如果已存在舊視頻，刪除舊的
      if (dbRecord.videoCloudinaryId && videoCloudinaryId !== dbRecord.videoCloudinaryId) {
        try {
          await deleteVideoFromCloudinary(dbRecord.videoCloudinaryId);
        } catch (error) {
          console.warn('Could not delete old video:', error.message);
        }
      }
      Object.assign(dbRecord, recordData);
      await dbRecord.save();
    } else {
      dbRecord = new Record(recordData);
      await dbRecord.save();
    }

    res.json({
      success: true,
      message: '紀錄已保存',
      record: dbRecord,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /records/batch
 * 批量上傳紀錄
 */
router.post('/batch', async (req, res) => {
  try {
    const { exportDate, recordCount, records } = req.body;

    if (!records || records.length === 0) {
      return res.status(400).json({ error: '缺少紀錄數據' });
    }

    const savedRecords = [];
    const errors = [];

    for (const record of records) {
      try {
        // 準備數據
        let videoUrl = null;
        let videoCloudinaryId = null;

        if (record.videoBase64) {
          try {
            const timestamp = Date.now();
            const filename = `video_${record.id}_${timestamp}.mp4`;
            const uploadResult = await uploadVideoToCloudinary(
              record.videoBase64,
              filename
            );
            videoUrl = uploadResult.secure_url;
            videoCloudinaryId = uploadResult.public_id;
          } catch (error) {
            console.warn(`Could not upload video for record ${record.id}:`, error.message);
          }
        }

        const recordData = {
          id: record.id,
          sentiment: record.sentiment,
          sentimentValue: record.sentimentValue,
          latitude: record.latitude,
          longitude: record.longitude,
          timestamp: record.timestamp,
          createdAt: record.createdAt,
          videoUrl: videoUrl,
          videoCloudinaryId: videoCloudinaryId,
          isUploaded: true,
        };

        let dbRecord = await Record.findOneAndUpdate(
          { id: record.id },
          recordData,
          { upsert: true, new: true }
        );

        savedRecords.push(dbRecord);
      } catch (error) {
        errors.push({
          recordId: record.id,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: `成功保存 ${savedRecords.length} 筆紀錄`,
      savedCount: savedRecords.length,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Batch upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /records/sync
 * 同步本機所有紀錄到雲端
 */
router.post('/sync', async (req, res) => {
  try {
    const { exportDate, recordCount, records } = req.body;

    if (!records || records.length === 0) {
      return res.status(400).json({ error: '缺少紀錄數據' });
    }

    const results = {
      synced: [],
      errors: [],
    };

    for (const record of records) {
      try {
        let videoUrl = null;
        let videoCloudinaryId = null;

        if (record.videoBase64) {
          try {
            const timestamp = Date.now();
            const filename = `video_${record.id}_${timestamp}.mp4`;
            const uploadResult = await uploadVideoToCloudinary(
              record.videoBase64,
              filename
            );
            videoUrl = uploadResult.secure_url;
            videoCloudinaryId = uploadResult.public_id;
          } catch (error) {
            console.warn(`Video upload failed for ${record.id}:`, error.message);
          }
        }

        const recordData = {
          id: record.id,
          sentiment: record.sentiment || 'unknown',
          sentimentValue: record.sentimentValue || 0,
          latitude: record.latitude,
          longitude: record.longitude,
          timestamp: record.timestamp,
          createdAt: record.createdAt,
          videoUrl: videoUrl,
          videoCloudinaryId: videoCloudinaryId,
          isUploaded: true,
        };

        const dbRecord = await Record.findOneAndUpdate(
          { id: record.id },
          recordData,
          { upsert: true, new: true }
        );

        results.synced.push(dbRecord._id);
      } catch (error) {
        results.errors.push({
          recordId: record.id,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: '同步完成',
      syncedCount: results.synced.length,
      errorCount: results.errors.length,
      results,
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /records/:id/video
 * 下載單個紀錄的視頻
 */
router.get('/:id/video', async (req, res) => {
  try {
    const record = await Record.findOne({ id: req.params.id });

    if (!record || !record.videoUrl) {
      return res.status(404).json({ error: '找不到視頻' });
    }

    // 重定向到 Cloudinary URL
    res.redirect(record.videoUrl);
  } catch (error) {
    console.error('Video download error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /records
 * 獲取所有紀錄
 */
router.get('/', async (req, res) => {
  try {
    const records = await Record.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
