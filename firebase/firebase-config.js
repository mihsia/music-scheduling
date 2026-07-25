// firebase-config.js
// ---------------------------------------------------------------------------
// 只需匯出 firebaseConfig 物件即可（值非機密,前端本來就會公開）。
// 取得位置：Firebase Console → 專案設定 ⚙ → 一般 → 你的應用程式 → SDK 設定與配置 → Config。
//
// 注意：不要在這裡放 initializeApp()/getAnalytics() 等程式碼,
// store.js 會自行初始化 Firebase。這裡「只」匯出設定物件。
// ---------------------------------------------------------------------------
export const firebaseConfig = {
  apiKey: "AIzaSyBFO7XP3rWL7jSPXBRK3AOOWdjpsPXh8ic",
  authDomain: "music-scheduling.firebaseapp.com",
  projectId: "music-scheduling",
  storageBucket: "music-scheduling.firebasestorage.app",
  messagingSenderId: "889936335720",
  appId: "1:889936335720:web:e27201d5050ab44f147cdd",
  measurementId: "G-J9XQNVLZKG",
};
