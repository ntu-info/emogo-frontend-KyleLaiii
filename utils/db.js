import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';

// 只在真正的 Web 才視為 isWeb
const isWeb = Platform.OS === 'web';

// Database initialization
let db = null;
let isInitialized = false;

export async function initDatabase() {
  if (isWeb) {
    console.warn('SQLite not available on web - using mock database');
    isInitialized = true;
    return null;
  }

  if (isInitialized && db) {
    return db;
  }

  try {
    db = await SQLite.openDatabaseAsync('emogo.db');
    await createTables();
    isInitialized = true;
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
  return db;
}

async function createTables() {
  if (!db || isWeb) return;

  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        videoPath TEXT NOT NULL,
        sentiment INTEGER NOT NULL,
        latitude REAL,
        longitude REAL,
        timestamp INTEGER NOT NULL,
        createdAt TEXT NOT NULL
      );
    `;

    // Try newer API first
    if (db.execAsync) {
      await db.execAsync(sql);
    } else if (db.exec) {
      // Fallback for older API
      db.exec([{ sql: sql.trim(), args: [] }]);
    } else {
      // Manual table creation if other methods don't work
      try {
        await db.runAsync(
          `CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            videoPath TEXT NOT NULL,
            sentiment INTEGER NOT NULL,
            latitude REAL,
            longitude REAL,
            timestamp INTEGER NOT NULL,
            createdAt TEXT NOT NULL
          )`
        );
      } catch (e) {
        console.warn('Table might already exist:', e.message);
      }
    }

    console.log('Tables created/verified');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

export async function saveRecord(videoPath, sentiment, latitude, longitude) {
  if (!db || isWeb) {
    console.warn('Database not available - record not saved');
    return Date.now();
  }

  try {
    const timestamp = Date.now();
    const createdAt = new Date().toISOString();

    let result;
    if (db.runAsync) {
      result = await db.runAsync(
        `INSERT INTO records (videoPath, sentiment, latitude, longitude, timestamp, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [videoPath, sentiment, latitude, longitude, timestamp, createdAt]
      );
    } else if (db.run) {
      // Fallback for older API
      result = await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO records (videoPath, sentiment, latitude, longitude, timestamp, createdAt)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [videoPath, sentiment, latitude, longitude, timestamp, createdAt],
          function (err) {
            if (err) reject(err);
            else resolve({ lastInsertRowId: this.lastID });
          }
        );
      });
    }

    console.log('Record saved:', result?.lastInsertRowId);
    return result?.lastInsertRowId || timestamp;
  } catch (error) {
    console.error('Error saving record:', error);
    throw error;
  }
}

export async function getAllRecords() {
  if (!db || isWeb) {
    console.warn('Database not available - returning empty records');
    return [];
  }

  try {
    let records;
    if (db.getAllAsync) {
      records = await db.getAllAsync(
        'SELECT * FROM records ORDER BY timestamp DESC'
      );
    } else if (db.all) {
      // Fallback for older API
      records = await new Promise((resolve, reject) => {
        db.all(
          'SELECT * FROM records ORDER BY timestamp DESC',
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });
    } else {
      records = [];
    }

    console.log('Loaded records:', records.length);
    return records || [];
  } catch (error) {
    console.error('Error fetching records:', error);
    return [];
  }
}

export async function getRecordById(id) {
  if (!db || isWeb) {
    console.warn('Database not available');
    return null;
  }

  try {
    let record;
    if (db.getFirstAsync) {
      record = await db.getFirstAsync(
        'SELECT * FROM records WHERE id = ?',
        [id]
      );
    } else if (db.get) {
      // Fallback for older API
      record = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM records WHERE id = ?', [id], (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        });
      });
    }

    return record || null;
  } catch (error) {
    console.error('Error fetching record:', error);
    return null;
  }
}

export async function deleteRecord(id) {
  if (!db || isWeb) {
    console.warn('Database not available');
    return;
  }

  try {
    // Get the record to find the video file
    const record = await getRecordById(id);

    // Delete the video file
    if (record && record.videoPath) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(record.videoPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(record.videoPath);
          console.log('Video file deleted:', record.videoPath);
        }
      } catch (error) {
        console.error('Error deleting video file:', error);
      }
    }

    // Delete the database record
    if (db.runAsync) {
      await db.runAsync('DELETE FROM records WHERE id = ?', [id]);
    } else if (db.run) {
      // Fallback for older API
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM records WHERE id = ?', [id], function (err) {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    console.log('Record deleted:', id);
  } catch (error) {
    console.error('Error deleting record:', error);
    throw error;
  }
}

export async function initFileSystem() {
  if (isWeb) {
    console.warn('File system not available on web');
    return null;
  }

  // Create data directory if it doesn't exist
  const dataDir = `${FileSystem.documentDirectory}data`;

  try {
    const dirInfo = await FileSystem.getInfoAsync(dataDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dataDir, { intermediates: true });
      console.log('Data directory created:', dataDir);
    }
  } catch (error) {
    console.error('Error initializing file system:', error);
  }

  return dataDir;
}

export function getDataDirectory() {
  return `${FileSystem.documentDirectory}data`;
}
