// backend/server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const recordRoutes = require('./routes/records');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 5000;

// 中間件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MongoDB 連接
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('✓ MongoDB connected');
  })
  .catch((error) => {
    console.error('✗ MongoDB connection error:', error);
    process.exit(1);
  });

// 健康檢查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'EmoGo Backend API is running',
    timestamp: new Date().toISOString(),
  });
});

// API 路由
app.use('/records', recordRoutes);
app.use('/export', exportRoutes);

// 根路由
app.get('/', (req, res) => {
  res.json({
    name: 'EmoGo Backend API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      uploadRecord: 'POST /records',
      uploadMultiple: 'POST /records/batch',
      syncRecords: 'POST /records/sync',
      getRecords: 'GET /records',
      downloadVideo: 'GET /records/:id/video',
      exportData: 'GET /export?format=json|csv',
    },
  });
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message,
    timestamp: new Date().toISOString(),
  });
});

// 啟動服務器
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  EmoGo Backend API                     ║
║  Server running on port ${PORT}        ║
║  Environment: ${process.env.NODE_ENV || 'development'}  ║
╚════════════════════════════════════════╝
  `);
});
