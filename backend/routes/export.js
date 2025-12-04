// backend/routes/export.js
const express = require('express');
const router = express.Router();
const Record = require('../models/Record');

/**
 * GET /export
 * 匯出所有紀錄為 CSV 或 JSON
 */
router.get('/', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const records = await Record.find().sort({ createdAt: -1 });

    if (format === 'csv') {
      // 轉換為 CSV
      const csvData = records.map((record) => ({
        ID: record.id,
        情緒: record.sentiment,
        情緒值: record.sentimentValue,
        經度: record.longitude || '',
        緯度: record.latitude || '',
        時間: new Date(record.timestamp).toLocaleString('zh-TW'),
        視頻URL: record.videoUrl || '無',
        Cloudinary_ID: record.videoCloudinaryId || '',
      }));

      const csv = require('json2csv').parse(csvData, {
        fields: ['ID', '情緒', '情緒值', '經度', '緯度', '時間', '視頻URL', 'Cloudinary_ID'],
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=emogo_export_${Date.now()}.csv`);
      res.send('\uFEFF' + csv); // BOM for Excel UTF-8 support
    } else {
      // JSON 格式（預設）
      const jsonData = {
        exportDate: new Date().toISOString(),
        recordCount: records.length,
        records: records.map((record) => ({
          id: record.id,
          sentiment: record.sentiment,
          sentimentValue: record.sentimentValue,
          latitude: record.latitude,
          longitude: record.longitude,
          timestamp: record.timestamp,
          videoUrl: record.videoUrl,
          videoCloudinaryId: record.videoCloudinaryId,
          createdAt: record.createdAt,
        })),
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=emogo_export_${Date.now()}.json`);
      res.json(jsonData);
    }
  } catch (error) {
    console.error('[/export] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /export/videos
 * 獲取所有已上傳的視頻列表和下載鏈接
 */
router.get('/videos', async (req, res) => {
  try {
    const records = await Record.find({ videoUrl: { $exists: true, $ne: null } })
      .select('id sentiment videoUrl videoCloudinaryId timestamp createdAt')
      .sort({ createdAt: -1 });

    const videos = records.map((record) => ({
      id: record.id,
      sentiment: record.sentiment,
      timestamp: record.timestamp,
      createdAt: record.createdAt,
      videoUrl: record.videoUrl,
      downloadLink: `/export/download/${record.id}`,
    }));

    res.json({
      success: true,
      count: videos.length,
      videos,
    });
  } catch (error) {
    console.error('[/export/videos] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /export/download/:recordId
 * 直接下載特定紀錄的視頻
 */
router.get('/download/:recordId', async (req, res) => {
  try {
    const record = await Record.findOne({ id: req.params.recordId });

    if (!record || !record.videoUrl) {
      return res.status(404).json({
        error: '找不到視頻',
        recordId: req.params.recordId,
      });
    }

    // 重定向到 Cloudinary 的視頻 URL
    // 可以添加 ?attachment=1 參數強制下載而不是在瀏覽器中播放
    const downloadUrl = `${record.videoUrl}?attachment=true`;
    res.redirect(downloadUrl);
  } catch (error) {
    console.error('[/export/download] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
