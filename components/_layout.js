// app/components/_layout.js 或 app/utils/_layout.js
import { Slot } from 'expo-router';

export default function Layout() {
  // 讓 expo-router 知道這個資料夾有 layout，但實際不渲染任何額外 UI
  return <Slot />;
}