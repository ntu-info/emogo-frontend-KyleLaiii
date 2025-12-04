// backend/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// 驗證必需的環境變數
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
  console.warn('⚠️  Warning: Cloudinary environment variables not fully configured');
  console.warn('   Set CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY in .env');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * 上傳視頻到 Cloudinary
 * @param {string} base64Data - base64 編碼的視頻數據
 * @param {string} filename - 文件名
 * @returns {Promise} Cloudinary 上傳結果
 */
async function uploadVideoToCloudinary(base64Data, filename) {
  return new Promise((resolve, reject) => {
    if (!base64Data) {
      return reject(new Error('No video data provided'));
    }

    if (!cloudinary.config().cloud_name) {
      return reject(new Error('Cloudinary not configured. Check environment variables.'));
    }

    console.log(`[Cloudinary] 開始上傳: ${filename}`);

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        public_id: filename.split('.')[0],
        folder: 'emogo/videos',
        overwrite: true,
        timeout: 60000, // 增加超時時間到 60 秒
      },
      (error, result) => {
        if (error) {
          console.error(`[Cloudinary] 上傳失敗 (${filename}):`, error);
          reject(error);
        } else {
          console.log(`[Cloudinary] 上傳成功 (${filename}):`, result.secure_url);
          resolve(result);
        }
      }
    );

    // 轉換 base64 為 Buffer 並寫入流
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      console.log(`[Cloudinary] 緩衝區大小: ${Math.round(buffer.length / 1024)} KB`);
      stream.end(buffer);
    } catch (error) {
      console.error(`[Cloudinary] 緩衝區轉換失敗:`, error);
      reject(error);
    }
  });
}

/**
 * 從 Cloudinary 刪除視頻
 * @param {string} publicId - Cloudinary 公開 ID
 * @returns {Promise}
 */
async function deleteVideoFromCloudinary(publicId) {
  try {
    console.log(`[Cloudinary] 刪除視頻: ${publicId}`);
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    console.log(`[Cloudinary] 刪除成功: ${publicId}`);
    return result;
  } catch (error) {
    console.error(`[Cloudinary] 刪除失敗: ${publicId}`, error);
    throw error;
  }
}

module.exports = {
  uploadVideoToCloudinary,
  deleteVideoFromCloudinary,
};
