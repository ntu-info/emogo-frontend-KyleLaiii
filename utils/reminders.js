// app/utils/reminders.js
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'EMOGO_REMINDERS_V1';

// 請求通知權限
export async function requestNotificationPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    return newStatus === 'granted';
  }
  return true;
}

// 取得已儲存提醒（如果沒有，就回傳空陣列）
export async function getSavedReminders() {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

// 把目前提醒列表重設成新的（先取消全部，再依列表重新排程）
export async function resetScheduledNotifications(reminders) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const scheduled = [];
  const now = new Date();

  for (const r of reminders) {
    // 先算出「下一次要提醒的 Date」
    let firstTrigger = new Date();
    firstTrigger.setHours(r.hour, r.minute, 0, 0);

    // 如果今天這個時間已經過了，就改成明天
    if (firstTrigger <= now) {
      firstTrigger.setDate(firstTrigger.getDate() + 1);
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'EmoGo 提醒',
        body: '來記錄一下現在的情緒與想法吧！',
        sound: 'default',
      },
      // 🔁 實際觸發使用「確定在未來的 Date」
      trigger: {
        date: firstTrigger,
        repeats: true, // 每天同一時間
      },
    });

    scheduled.push({
      ...r,
      notificationId,
    });
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(scheduled));
  return scheduled;
}

// 第一次啟動：如果沒有任何提醒，就建立 9:00 / 15:00 / 21:00 三個預設
export async function initializeDefaultRemindersIfNeeded() {
  const existing = await getSavedReminders();
  if (existing && existing.length > 0) {
    return existing;
  }

  const defaults = [
    { id: 'morning',  hour: 9,  minute: 0 },
    { id: 'afternoon',hour: 15, minute: 0 },
    { id: 'night',    hour: 21, minute: 0 },
  ];

  return await resetScheduledNotifications(defaults);
}

// 新增一個提醒（會一起重新排程）
export async function addReminder(reminders, hour, minute) {
  const newReminder = {
    id: `custom-${Date.now()}`,
    hour,
    minute,
  };
  const next = [...reminders, newReminder];
  return await resetScheduledNotifications(next);
}

// 刪除提醒（會一起重新排程）— 外面自己先檢查長度 ≥ 4 再呼叫
export async function removeReminder(reminders, id) {
  const next = reminders.filter((r) => r.id !== id);
  return await resetScheduledNotifications(next);
}

export async function updateReminder(reminders, id, hour, minute) {
  const next = reminders.map((r) =>
    r.id === id
      ? { ...r, hour, minute }   // 只改這個提醒的時間
      : r
  );
  return await resetScheduledNotifications(next);
}

// 把時間轉成 "HH:MM" 字串，方便 UI 顯示
export function formatTime({ hour, minute }) {
  const h = String(hour).padStart(2, '0');
  const m = String(minute).padStart(2, '0');
  return `${h}:${m}`;
}
