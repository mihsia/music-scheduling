# 音樂班個別課排課系統

外聘老師、學生與琴房資料庫,表單式排課與衝突檢查,報表通知與 Dashboard 總覽。

**目前為「單機版」:** 所有資料(老師/學生/琴房/排課結果/排課原則)會儲存在瀏覽器的
`localStorage`,重新整理或關閉後仍會保留,且 7 個頁面共用同一份資料、即時連動。
未來可在不更動各頁的情況下改接 Firebase(見最後一節)。

## 頁面

| 檔案 | 說明 |
| --- | --- |
操作流程(側邊選單由上而下):**總覽 → 系統設定 → 基本資料(老師/學生/琴房)→ 排課作業(原則/工作台/班級課表)→ 報表中心**。

| 檔案 | 說明 |
| --- | --- |
| `index.html` | 首頁,連結各功能頁 |
| `系統設定.dc.html` | 學校名稱、學年學期、每堂課長、使用權限(Google 帳號白名單) |
| `系統流程總覽.dc.html` | 系統架構與操作流程地圖 |
| `排課工作台.dc.html` | 核心排課介面(選老師→學生→時段 + 衝突檢查,結果會保存) |
| `Dashboard總覽.dc.html` | 排課進度、衝突、琴房使用率(由實際排課結果即時計算) |
| `資料庫管理.dc.html` | 老師 / 學生 / 琴房三庫(新增、搜尋、編輯,永久保存) |
| `排課原則設定.dc.html` | 衝突檢查、不連排、午休、不排課時段等規則 |
| `班級課表.dc.html` | 依班級顯示一週個別課分布 |
| `報表中心.dc.html` | 全校總表/鐘點統計/通知單/琴房/待排衝突,可預覽並列印 PDF、Excel(CSV)、Word(.doc) |
| `手機課表通知單.dc.html` | 學生 / 老師手機通知單(可選擇對象) |
| `紙本通知單.dc.html` | A4 可列印通知單(可選擇對象) |

### 共用程式

| 檔案 | 說明 |
| --- | --- |
| `store.js` | **共享資料層**。localStorage(單機)或 Firebase(雲端)雙模式,含學校設定與帳號白名單。 |
| `nav.js` | 側邊選單(依流程分組、目前頁高亮)、登入者資訊、全站學校/學年文字套用。 |
| `support.js` | Design Component 執行期(原型內建,勿手動修改)。 |

> 各頁腳本以 `?v=N` 版本參數載入;**更新程式後請把所有 .dc.html 的 `?v=` 號碼 +1 再部署**,使用者瀏覽器才會抓到新版(免硬重整)。

## 使用與重點

- **資料持久化**:在「資料庫管理」新增/編輯老師、學生、琴房後,資料立即保存;在「排課工作台」排入的課,會即時出現在 Dashboard、通知單。
- **跨頁、跨分頁同步**:同一瀏覽器開多個分頁,資料變動會互相同步。
- **範圍**:資料只存在「目前這台電腦的這個瀏覽器」。換電腦/瀏覽器不會看到同一份資料(多人共用需改接 Firebase)。
- **重置示範資料**:在任一頁開瀏覽器主控台執行 `AppStore.resetAll()` 即可還原成內建範例資料。

## 部署到 GitHub Pages

1. 建立一個新的 GitHub repo(例:`music-scheduling`)。
2. 將本資料夾所有檔案 push 到 repo:
   ```bash
   git init
   git add .
   git commit -m "init: 音樂班排課系統原型"
   git branch -M main
   git remote add origin https://github.com/<你的帳號>/music-scheduling.git
   git push -u origin main
   ```
3. repo → **Settings → Pages** → Source 選 `main` 分支、`/ (root)` → Save。
4. 數分鐘後即可由 `https://<你的帳號>.github.io/music-scheduling/` 開啟。

## 開啟 Firebase 多人共用(Google 登入)

程式已內建雲端支援:**只要在 `firebase/firebase-config.js` 填入有效設定,`store.js`
就會自動切換為雲端模式**(Google 登入 + Firestore 即時同步,多人共用同一份資料);
維持 `YOUR_` 預設值則保持單機。**各頁面、其他程式都不需更動。**

### 一次性設定步驟

1. 到 [Firebase Console](https://console.firebase.google.com/) → **新增專案**(名稱自取,可關閉 Analytics)。
2. 左側 **建構 → Firestore Database → 建立資料庫**,地點選 `asia-east1`(或就近),先選「正式版」。
3. 左側 **建構 → Authentication → 開始使用 → Sign-in method → 啟用 Google**,儲存。
4. Authentication → **Settings → 授權網域** 新增:`mihsia.github.io`(本機測試再加 `localhost`)。
5. 專案設定 ⚙ → **一般 → 你的應用程式 → 網頁 `</>`** 註冊一個 Web App,複製 `firebaseConfig`。
6. 把那段值貼進 `firebase/firebase-config.js`(取代 `YOUR_...`)。
7. Firestore → **規則(Rules)** 貼上下方規則並發布。
8. 重新部署(再跑一次 `deploy_to_github.command`)。開站時會出現 Google 登入,登入後即雲端共享。
   首位登入者會自動把目前的範例資料寫入雲端(之後不會重複)。

### Firestore 安全規則(僅限登入者讀寫)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

> 想再收緊成「只有特定 Email 能寫入」,可改為
> `allow read, write: if request.auth != null && request.auth.token.email in ['a@x.com','b@x.com'];`

### 資料結構(與 `store.js` 種子一致)

- `teachers/{id}`、`students/{id}`、`rooms/{id}`、`bookings/{id}`、`rules/114-1`
- 各欄位同單機版;`store.js` 以 `onSnapshot` 即時同步到既有的 `subscribe` 機制,故各頁自動更新。

## 樂器組別配色

| 組別 | 色碼 |
| --- | --- |
| 弦樂 | `#FF8E63` |
| 鋼琴 | `#F2B33C` |
| 管樂 | `#3FD0A8` |
| 擊樂 | `#FF6FB5` |
| 主色 | `#6D54E8` / `#9A4FE0` |
