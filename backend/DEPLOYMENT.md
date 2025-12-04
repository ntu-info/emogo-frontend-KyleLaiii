# EmoGo 後端部署指南

## 架構概述

```
EmoGo 應用
    ↓
React Native 前端 (Expo Go)
    ↓
Node.js/Express 後端 (Render)
    ↓
├─ MongoDB Atlas (數據存儲)
└─ Cloudinary (視頻存儲)
```

## 部署步驟

### 1. 準備 MongoDB Atlas

1. 訪問 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. 創建免費帳戶
3. 創建新的 Cluster
4. 設置允許的 IP 地址（選擇 "Allow from anywhere" 或添加 Render IP）
5. 創建數據庫用戶和密碼
6. 複製連接字符串：`mongodb+srv://username:password@cluster.mongodb.net/emogo?retryWrites=true&w=majority`

### 2. 準備 Cloudinary

1. 訪問 [Cloudinary](https://cloudinary.com/)
2. 註冊免費帳戶
3. 從儀表板複製：
   - Cloud Name
   - API Key
   - API Secret

### 3. 配置環境變量

複製 `.env.example` 為 `.env` 並填入：

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/emogo?retryWrites=true&w=majority
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
PORT=5000
NODE_ENV=production
```

### 4. 部署到 Render

#### 方法 A: 使用 Git (推薦)

1. 將後端代碼推送到 GitHub
   ```bash
   git add backend/
   git commit -m "Add backend server"
   git push origin main
   ```

2. 訪問 [Render.com](https://render.com/)
3. 連接 GitHub 帳戶
4. 創建 New → Web Service
5. 選擇你的 GitHub 倉庫
6. 配置：
   - **Name**: emogo-backend
   - **Environment**: Node
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Region**: 選擇離用戶最近的地區

7. 添加環境變量：
   - `MONGODB_URI`: 你的 MongoDB 連接字符串
   - `CLOUDINARY_CLOUD_NAME`: 你的 Cloud Name
   - `CLOUDINARY_API_KEY`: 你的 API Key
   - `CLOUDINARY_API_SECRET`: 你的 API Secret
   - `NODE_ENV`: production

8. 點擊 "Deploy"

#### 方法 B: 使用 Render CLI

```bash
# 安裝 Render CLI
npm install -g render-cli

# 登錄
render login

# 部署
render deploy
```

### 5. 測試部署

部署完成後，訪問：
```
https://your-service-name.onrender.com
```

應該看到：
```json
{
  "name": "EmoGo Backend API",
  "version": "1.0.0",
  "endpoints": { ... }
}
```

### 6. 更新前端 API 地址

在 `utils/api.js` 中更新：
```javascript
const API_BASE_URL = 'https://your-service-name.onrender.com';
```

## API 端點

### 上傳紀錄
```
POST /records
Content-Type: application/json

{
  "exportDate": "2025-11-29T...",
  "recordCount": 1,
  "records": [{
    "id": "1",
    "sentiment": "非常好",
    "sentimentValue": 5,
    "latitude": 25.033,
    "longitude": 121.564,
    "timestamp": "2025-11-29T...",
    "videoBase64": "base64_encoded_video_data"
  }]
}
```

### 批量上傳
```
POST /records/batch
```

### 同步所有紀錄
```
POST /records/sync
```

### 下載單個視頻
```
GET /records/{id}/video
```

### 匯出所有數據
```
GET /export?format=json
GET /export?format=csv
```

### 獲取所有紀錄
```
GET /records
```

## 故障排除

### MongoDB 連接失敗
- 檢查連接字符串是否正確
- 確認 IP 地址在 MongoDB Atlas 白名單中
- 檢查用戶名和密碼

### Cloudinary 上傳失敗
- 驗證 API Key 和 Secret
- 檢查視頻文件大小（免費帳戶限制）
- 查看 Cloudinary 儀表板的使用配額

### Render 部署失敗
- 檢查構建日誌中的錯誤
- 確認所有環境變量都已設置
- 驗證 package.json 中的依賴項

## 本地開發

```bash
cd backend

# 安裝依賴
npm install

# 創建 .env 文件（複製 .env.example）
cp .env.example .env

# 編輯 .env 並填入你的值
nano .env

# 啟動開發服務器
npm run dev
```

服務器將在 `http://localhost:5000` 啟動。

## 監控

### Render 日誌
- 訪問 Render Dashboard → Logs 查看服務器日誌

### MongoDB Atlas 監控
- 訪問 Clusters → Monitoring 查看數據庫活動

### Cloudinary 統計
- 訪問 Cloudinary Dashboard → Usage 查看存儲使用情況
