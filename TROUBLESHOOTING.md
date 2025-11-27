# EmoGo App 啟動問題診斷與修復指南

## 🔍 識別的問題

### 1. **缺失依賴和 API 版本衝突**
   - `expo-sqlite` API 變化：`execAsync` 可能在某些版本中不可用
   - `expo-camera` 需要正確的權限管理
   - 需要 `expo-av` 用於影片播放

### 2. **React 依賴數組問題**
   - VideoRecorder 中的 useEffect 缺少 requestPermission 依賴

### 3. **初始化順序問題**
   - 資料庫和檔案系統初始化需要更強大的錯誤處理

### 4. **iOS 特定配置**
   - 需要 Info.plist 權限說明
   - 位置權限需要正確配置

---

## ✅ 已進行的修正

### 1. 更新 db.js
```
✓ 增加了 API 相容性層（支援多個 SQLite API 版本）
✓ 改進了錯誤處理和日誌記錄
✓ 新增初始化狀態追蹤
```

### 2. 修復 VideoRecorder.js
```
✓ 修復 useEffect 依賴數組
✓ 改進影片回調處理
✓ 記錄開始時間更早設置
```

### 3. 改進 HomeScreen (index.js)
```
✓ 增加初始化錯誤顯示
✓ 改進訊息顯示時間
✓ 增加完整的錯誤日誌
✓ 確保檔案目錄存在
```

---

## 🚀 如何測試應用程式

### 選項 A：使用 Metro 網頁界面（推薦用於初始測試）

1. **啟動開發伺服器**
   ```powershell
   cd c:\Users\User\github-classroom\ntu-info\emogo-frontend-KyleLaiii
   npm start
   ```

2. **在瀏覽器中打開**
   ```
   http://localhost:8081
   ```
   - 按 `w` 打開 Web 版本
   - 等待編譯完成
   - 應該看到藍色的 Expo 菜單

3. **在 iOS 設備上測試**
   - 按 `i` 打開 iOS 模擬器（如果已安裝）
   - 或掃描二維碼使用 Expo Go 應用程式

### 選項 B：使用 Expo Go（iOS 手機）

1. **在 iPhone 上安裝 Expo Go**
   - App Store 搜尋 "Expo Go"
   - 安裝官方應用程式

2. **確保手機和電腦在同一 Wi-Fi 網路**

3. **掃描 Metro 菜單中的 QR 碼**
   - 使用 iPhone 相機應用程式掃描
   - 或在 Expo Go 應用程式中掃描

---

## 🛠️ iOS 特定配置

### app.json 中已配置的權限：

```json
"ios": {
  "bundleIdentifier": "com.emogo.app",
  "infoPlist": {
    "NSCameraUsageDescription": "This app needs camera access to record videos",
    "NSMicrophoneUsageDescription": "This app needs microphone access to record audio in videos",
    "NSLocationWhenInUseUsageDescription": "This app needs location access to record GPS coordinates",
    "NSLocationAlwaysAndWhenInUseUsageDescription": "This app needs location access to record GPS coordinates"
  }
}
```

### 如果仍然出現權限問題：

1. **清除快取**
   ```powershell
   npm start -- --clear
   ```

2. **刪除 node_modules 並重新安裝**
   ```powershell
   rm -r node_modules
   npm install
   npm start
   ```

---

## 📋 常見問題和解決方案

### 問題：「Metro 旋轉但沒有選項」

**原因：**
- 編譯失敗
- JavaScript 錯誤
- 路由配置問題

**解決方案：**
```powershell
# 1. 檢查終端輸出是否有紅色錯誤信息
# 2. 清除快取
npm start --clear

# 3. 檢查 JavaScript 語法
npm run lint  # 如果已配置

# 4. 完全重建
rm -r node_modules package-lock.json
npm install
npm start
```

### 問題：「Expo Go 中請求超時」

**原因：**
- 開發伺服器未正確啟動
- 網路連接問題
- 編譯時間過長

**解決方案：**
```powershell
# 1. 停止現有進程
Get-Process node | Stop-Process -Force

# 2. 清除埠 (8081 和 19000)
# 通常自動完成，但如果問題持續：
# - 重啟電腦
# - 或使用 netstat 查找占用埠的進程

# 3. 重新啟動伺服器
npm start --clear

# 4. 等待完全編譯
# 檢查終端，應該看到：
# 「Metro Bundler ready.」或類似信息
```

### 問題：「應用程式崩潰或黑屏」

**原因：**
- 初始化錯誤
- 元件導入失敗
- 相機或位置權限問題

**解決方案：**
```
# 1. 檢查終端日誌（紅色文字表示錯誤）
# 2. 查看應用程式中顯示的錯誤訊息
# 3. 如果初始化失敗，錯誤應該被捕獲並顯示

# 4. 逐步禁用功能進行測試：
# - 先移除視頻錄製器
# - 然後測試情緒量表
# - 最後測試位置服務
```

---

## 🧪 測試步驟

### 第 1 步：基礎應用程式載入
```
✓ 應該看到 "EmoGo 影片紀錄" 標題
✓ 應該看到 "初始化中..." 進度指示器（短暫）
✓ 然後應該看到完整的應用程式介面
```

### 第 2 步：相機功能
```
1. 點擊 "開始錄影" 按鈕
2. 同意相機權限提示
3. 錄製至少 1 秒的影片
4. 點擊 "停止錄影"
5. 應該看到 "✓ 影片已錄製" 訊息
```

### 第 3 步：情緒選擇
```
1. 選擇任何情緒選項
2. 應該看到顏色高亮和確認訊息
```

### 第 4 步：輸出記錄
```
1. 點擊 "輸出紀錄" 按鈕
2. 允許位置權限（如需要）
3. 應該看到成功訊息
```

### 第 5 步：查看記錄
```
1. 點擊 "查看過往紀錄"
2. 應該看到剛才保存的記錄
3. 點擊記錄展開詳細信息
4. 可以播放視頻並查看位置資訊
```

---

## 🔧 進階調試

### 在終端查看詳細日誌：
```powershell
# Metro 應該顯示類似這樣的信息：
# [Metro] 🎉 Metro bundler ready.
# [HMR] Hot Reloading enabled.
# [expo-cli] Opening on Android.
# 或
# [expo-cli] Opening in Expo Go...
```

### 檢查具體錯誤：
1. 在終端尋找紅色文字 (ERROR, Error 或 error)
2. 在應用程式中查看是否有灰色文本顯示錯誤
3. 複製完整錯誤訊息以便分析

### 啟用更詳細的日誌：
```javascript
// 在 app/(tabs)/index.js 中已添加
console.log('Starting app initialization...');
console.log('File system initialized');
console.log('Database initialized');
```

---

## 📱 iOS 設備特定說明

### 對於 iOS 實機測試：

1. **設備準備**
   - 確保 iOS 13 或更高版本
   - 允許不受信任的開發人員（設置 > 一般 > VPN 和設備管理）

2. **網路配置**
   - 手機和電腦必須在同一 Wi-Fi
   - 嘗試在 Wi-Fi 詳細設定中禁用代理

3. **常見 iOS 權限問題**
   ```
   - 相機：設置 > 隱私 > 相機 > EmoGo
   - 位置：設置 > 隱私 > 位置服務 > EmoGo
   - 麥克風：設置 > 隱私 > 麥克風 > EmoGo
   ```

---

## 📞 如果問題仍未解決

請提供以下信息：

1. **終端完整輸出**（複製紅色錯誤信息）
2. **應用程式中顯示的錯誤訊息**（螢幕截圖）
3. **您的環境**：
   - Node.js 版本：`node --version`
   - npm 版本：`npm --version`
   - iOS 版本
   - Expo SDK 版本

---

## 🎯 預期功能

應用程式應該支援以下功能：

- ✓ 錄製 1+ 秒的視頻
- ✓ 5 級情緒量表（非常差到非常好）
- ✓ GPS 位置捕獲
- ✓ 本機 SQLite 資料庫儲存
- ✓ 離線使用（無需網際網路）
- ✓ 查看過往記錄
- ✓ 刪除記錄
- ✓ 應用程式設定頁面
