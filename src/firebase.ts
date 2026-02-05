// 檔案位置: src/firebase.ts

// 1. 引入 Firebase 功能
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// ==========================================
// 2. 請把你在 Firebase 網頁複製的那段 firebaseConfig 貼在下面這裡
// 取代掉原本這裡的範例
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyBvQJaeKLJj7mLAO4cJUy_HjoT0cfxRB0k",
  authDomain: "editflow-calendar.firebaseapp.com",
  projectId: "editflow-calendar",
  storageBucket: "editflow-calendar.firebasestorage.app",
  messagingSenderId: "145259527920",
  appId: "1:145259527920:web:000cc0fefaa5ed398b4c35",
  measurementId: "G-GKG70XW7FB"
};

// ==========================================

// 3. 啟動 Firebase
const app = initializeApp(firebaseConfig);

// 4. 匯出資料庫，讓 App.tsx 可以使用
export const db = getFirestore(app);