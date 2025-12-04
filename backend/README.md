# EmoGo 後端 API

Node.js + Express + MongoDB + Cloudinary 構成的完整後端服務。

## 功能

✅ 上傳單筆/批量情緒紀錄  
✅ 視頻上傳到 Cloudinary 雲存儲  
✅ 紀錄數據存儲到 MongoDB Atlas  
✅ 完整的數據同步機制  
✅ 支持 JSON 和 CSV 格式匯出  
✅ 視頻下載和流媒體播放  

## 快速開始

### 安裝依賴
```bash
npm install
```

### 配置環境
```bash
cp .env.example .env
# 編輯 .env 填入你的配置
```

### 運行開發服務器
```bash
npm run dev
```

### 運行生產環境
```bash
npm start
```

## 環境變量

| 變量 | 說明 | 示例 |
|------|------|------|
| `MONGODB_URI` | MongoDB 連接字符串 | `mongodb+srv://...` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Cloud Name | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | `123456789` |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | `secret_key_here` |
| `PORT` | 服務器端口 | `5000` |
| `NODE_ENV` | 環境模式 | `development` 或 `production` |

## 詳細部署說明

見 [DEPLOYMENT.md](./DEPLOYMENT.md)
