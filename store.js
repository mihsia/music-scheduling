// store.js — 音樂班個別課排課系統 · 共享資料層
// ---------------------------------------------------------------------------
// 兩種模式,各頁面程式完全相同、不需更動:
//   1) 單機模式（預設）：資料存在瀏覽器 localStorage。
//   2) 雲端模式：當 firebase/firebase-config.js 填入有效設定時,自動改用
//      Firebase（Google 登入 + Firestore 即時同步,多人共用同一份資料）。
//
// 對外一律只暴露 window.AppStore;讀取（list/bookings/getRules/scheduling*）
// 永遠是同步、由記憶體快取回傳。雲端模式下,Firestore 的 onSnapshot 會即時
// 更新快取並通知各頁重繪;寫入（upsert/remove/replace/setRules）會送到雲端。
// ---------------------------------------------------------------------------
(function () {
  "use strict";

  var STORAGE_KEY = "music-scheduling/db";
  var AUTH_KEY = "music-scheduling/authed"; // 曾登入記號,避免換頁時閃登入卡
  var VERSION = 1;
  var TERM = "114-1"; // 114 學年度第 1 學期
  var COLLS = ["teachers", "students", "rooms", "bookings"];

  // ===== 時段模型 =====
  var PERIODS = [
    { k: "p1", label: "1", time: "08:10" },
    { k: "p2", label: "2", time: "09:10" },
    { k: "p3", label: "3", time: "10:10" },
    { k: "p4", label: "4", time: "11:10" },
    { k: "lunch", label: "午", time: "12:00", lunch: true },
    { k: "p6", label: "5", time: "13:10" },
    { k: "p7", label: "6", time: "14:10" },
    { k: "p8", label: "7", time: "15:10" },
    { k: "p9", label: "8", time: "16:10" },
  ];
  var AM = ["p1", "p2", "p3", "p4"];
  var PM = ["p6", "p7", "p8", "p9"];
  var DAYS = ["一", "二", "三", "四", "五"];
  var GROUP_LABEL = { strings: "弦樂", piano: "鋼琴", winds: "管樂", perc: "擊樂" };

  // ===== 種子資料（單機首次開啟、或雲端集合為空時寫入） =====
  var SEED = {
    version: VERSION, term: TERM,
    teachers: [
      { id: "t1", name: "林筱晴", group: "strings", instrument: "小提琴", days: ["一", "三", "五"], slot: "下午", phone: "0912-345-678", status: "啟用",
        open: { "一": ["p6", "p7", "p8"], "三": ["p6", "p7", "p8", "p9"], "五": ["p7", "p8"] } },
      { id: "t2", name: "陳冠宇", group: "piano", instrument: "鋼琴", days: ["二", "四"], slot: "上午", phone: "0922-118-220", status: "啟用",
        open: { "二": ["p1", "p2", "p3", "p4"], "四": ["p6", "p7", "p8"] } },
      { id: "t3", name: "蘇敏華", group: "piano", instrument: "鋼琴", days: ["一", "五"], slot: "下午", phone: "0933-507-661", status: "啟用",
        open: { "一": ["p7", "p8", "p9"], "五": ["p6", "p7", "p8"] } },
      { id: "t4", name: "王建霖", group: "winds", instrument: "長笛", days: ["一", "四"], slot: "全天", phone: "0955-204-883", status: "啟用",
        open: { "一": ["p1", "p2", "p3"], "四": ["p7", "p8", "p9"] } },
      { id: "t5", name: "李思妤", group: "perc", instrument: "木琴 / 定音鼓", days: ["三", "五"], slot: "下午", phone: "0987-661-204", status: "啟用",
        open: { "三": ["p1", "p2"], "五": ["p6", "p7", "p8", "p9"] } },
      { id: "t6", name: "吳冠廷", group: "strings", instrument: "大提琴", days: ["二"], slot: "下午", phone: "0910-882-114", status: "停用" },
    ],
    students: [
      { id: "s1", name: "王心妍", klass: "七年甲", majorG: "strings", majorI: "小提琴", minorG: "piano", minorI: "鋼琴", sched: "已排" },
      { id: "s2", name: "張庭瑋", klass: "七年乙", majorG: "strings", majorI: "大提琴", minorG: "piano", minorI: "鋼琴", sched: "排課中" },
      { id: "s3", name: "陳奕廷", klass: "八年甲", majorG: "piano", majorI: "鋼琴", minorG: "winds", minorI: "長笛", sched: "已排" },
      { id: "s4", name: "李宛蓉", klass: "八年乙", majorG: "winds", majorI: "單簧管", minorG: "piano", minorI: "鋼琴", sched: "待排" },
      { id: "s5", name: "許芷昀", klass: "九年甲", majorG: "perc", majorI: "木琴", minorG: "piano", minorI: "鋼琴", sched: "已排" },
      { id: "s6", name: "林佑安", klass: "九年乙", majorG: "piano", majorI: "鋼琴", minorG: "strings", minorI: "小提琴", sched: "排課中" },
      { id: "s7", name: "黃于晴", klass: "七年甲", majorG: "piano", majorI: "鋼琴", minorG: "winds", minorI: "長笛", sched: "待排" },
      { id: "s8", name: "鄭家豪", klass: "八年甲", majorG: "winds", majorI: "小號", minorG: "perc", minorI: "小鼓", sched: "已排" },
    ],
    rooms: [
      { id: "A101", name: "A101", floor: "1F", equip: "平台鋼琴 ×1、譜架 ×2", groups: ["strings", "piano"], slot: "全天", status: "啟用" },
      { id: "A102", name: "A102", floor: "1F", equip: "直立鋼琴 ×1", groups: ["piano"], slot: "全天", status: "啟用" },
      { id: "B203", name: "B203", floor: "2F", equip: "平台鋼琴、隔音", groups: ["piano"], slot: "上午", status: "啟用" },
      { id: "C305", name: "C305", floor: "3F", equip: "打擊器材組、木琴", groups: ["perc", "winds"], slot: "下午", status: "啟用" },
      { id: "C306", name: "C306", floor: "3F", equip: "管樂練習、譜架 ×4", groups: ["winds"], slot: "全天", status: "啟用" },
      { id: "D108", name: "D108", floor: "1F", equip: "多功能教室", groups: ["strings", "piano", "winds", "perc"], slot: "下午", status: "停用" },
    ],
    bookings: [
      { id: "bk1", day: "三", k: "p6", teacherId: "t1", studentId: "s2", student: "張庭瑋", room: "A101", type: "主修", term: TERM },
      { id: "bk2", day: "四", k: "p7", teacherId: "t4", studentId: "s3", student: "陳奕廷", room: "B203", type: "副修", term: TERM },
      { id: "bk3", day: "五", k: "p7", teacherId: "t5", studentId: "s5", student: "許芷昀", room: "C305", type: "主修", term: TERM },
    ],
    rules: {
      courseLen: 45, buffer: 10, dayStart: "08:00", dayEnd: "17:00",
      chkTeacher: "block", chkRoom: "block", chkClass: "block",
      noConsecutive: true, noSameDay: false, maxPerDay: 2,
      avoidLunch: true, lunchStart: "12:00", lunchEnd: "13:00",
      blocks: [
        { id: "b1", label: "週三 社團活動", time: "15:00–17:00", on: true },
        { id: "b2", label: "每日 升旗 / 早自習", time: "07:50–08:10", on: true },
        { id: "b3", label: "週五 班會", time: "15:10–16:00", on: false },
      ],
      majorFirst: true, autoFill: true, autoSuggest: true,
    },
    settings: {
      schoolFull: "和聲國民中學 音樂班",
      schoolShort: "和聲國中音樂班",
      year: 114,
      term: 1,
      allowedEmails: [], // 空陣列 = 任何登入者皆可;填入則僅這些 Google 帳號可操作
    },
  };

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  // ===== 記憶體快取（兩種模式共用） =====
  var db = null;
  var mode = "local"; // 'local' | 'firebase'

  function loadLocal() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { return null; } }
  function saveLocal() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch (e) {} }

  db = loadLocal();
  if (!db || typeof db !== "object") {
    db = clone(SEED); saveLocal();
  } else {
    COLLS.forEach(function (c) { if (!Array.isArray(db[c])) db[c] = clone(SEED[c]); });
    if (!db.rules || typeof db.rules !== "object") db.rules = clone(SEED.rules);
    if (!db.settings || typeof db.settings !== "object") db.settings = clone(SEED.settings);
    if (!Array.isArray(db.settings.allowedEmails)) db.settings.allowedEmails = [];
    if (!db.term) db.term = TERM;
    db.version = VERSION;
  }

  var subs = [];
  function emit() { subs.forEach(function (fn) { try { fn(db); } catch (e) {} }); }

  // 跨分頁同步（單機模式;雲端模式由 onSnapshot 負責）
  window.addEventListener("storage", function (e) {
    if (mode === "local" && e.key === STORAGE_KEY) {
      var next = loadLocal();
      if (next) { db = next; emit(); }
    }
  });

  function genId(prefix) { return prefix + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }

  // ===== 換算 helper（排課工作台用的形狀） =====
  function slotPeriods(slot) {
    if (slot === "上午") return AM.slice();
    if (slot === "下午") return PM.slice();
    if (slot === "全天") return AM.concat(PM);
    return [];
  }
  function teacherSlots(t) {
    if (Array.isArray(t.slots) && t.slots.length) return t.slots;
    if (t.slot) return [t.slot];
    return [];
  }
  // 老師可排時段：以「開課日 × 開課時段(可多選)」推導,讓資料庫管理的編輯即時反映到排課工作台
  function teacherOpen(t) {
    if (t.days && t.days.length) {
      var slots = teacherSlots(t), open = {};
      t.days.forEach(function (d) {
        var set = {};
        slots.forEach(function (s) { slotPeriods(s).forEach(function (p) { set[p] = 1; }); });
        var arr = AM.concat(PM).filter(function (p) { return set[p]; });
        open[d] = arr.length ? arr : PM.slice();
      });
      return open;
    }
    if (t.open && Object.keys(t.open).length) return clone(t.open);
    return {};
  }
  function roomTag(r) { return (r.groups || []).map(function (g) { return GROUP_LABEL[g] || g; }).join(" / ") || "—"; }
  function studentClassPeriods() { var cls = {}; DAYS.forEach(function (d) { cls[d] = AM.slice(); }); return cls; }

  // ===== 快取變更（供本機寫入與 onSnapshot 共用） =====
  function cacheUpsert(col, rec) {
    if (!db[col]) db[col] = [];
    var i = db[col].findIndex(function (x) { return x.id === rec.id; });
    if (i >= 0) db[col][i] = rec; else db[col].push(rec);
  }
  function cacheRemove(col, id) { db[col] = (db[col] || []).filter(function (x) { return x.id !== id; }); }
  function cacheReplace(col, arr) { db[col] = clone(arr); }

  // ===== 雲端後端（連線成功後填入） =====
  var fb = null; // { setDoc, deleteDoc, replaceColl, setRules, setSettings }
  var currentUser = null; // { name, email, photo } 雲端登入後填入
  var doSignOut = null;   // 由 connectFirebase 填入

  // ===== 對外 API =====
  var AppStore = {
    TERM: TERM, PERIODS: PERIODS, DAYS: DAYS, GROUP_LABEL: GROUP_LABEL,
    get mode() { return mode; },

    list: function (col) { return clone(db[col] || []); },
    all: function () { return clone(db); },

    upsert: function (col, item) {
      var rec = clone(item);
      if (!rec.id) rec.id = genId(col.charAt(0));
      cacheUpsert(col, rec); emit();
      if (mode === "firebase" && fb) fb.setDoc(col, rec); else saveLocal();
      return rec.id;
    },
    replace: function (col, arr) {
      var oldIds = (db[col] || []).map(function (x) { return x.id; });
      cacheReplace(col, arr); emit();
      if (mode === "firebase" && fb) fb.replaceColl(col, clone(arr), oldIds); else saveLocal();
    },
    remove: function (col, id) {
      cacheRemove(col, id); emit();
      if (mode === "firebase" && fb) fb.deleteDoc(col, id); else saveLocal();
    },

    getRules: function () { return clone(db.rules || SEED.rules); },
    setRules: function (rules) {
      db.rules = Object.assign(clone(db.rules || SEED.rules), clone(rules)); emit(); // 合併,避免不同頁面互相覆蓋
      if (mode === "firebase" && fb) fb.setRules(db.rules); else saveLocal();
    },

    // --- 學校 / 學年設定 ---
    getSettings: function () { return clone(db.settings || SEED.settings); },
    setSettings: function (s) {
      db.settings = Object.assign(clone(db.settings || SEED.settings), clone(s)); emit(); // 合併,保留未提供的欄位(如 allowedEmails)
      if (mode === "firebase" && fb) fb.setSettings(db.settings); else saveLocal();
    },
    // 常用標題字串
    schoolFull: function () { return (db.settings || SEED.settings).schoolFull; },
    schoolShort: function () { return (db.settings || SEED.settings).schoolShort; },
    yearTerm: function (spaced) {
      var s = db.settings || SEED.settings;
      return spaced ? (s.year + " 學年度 第 " + s.term + " 學期") : (s.year + " 學年度第 " + s.term + " 學期");
    },
    yearTermShort: function () { var s = db.settings || SEED.settings; return s.year + "-" + s.term; },

    // --- 目前登入者（雲端模式） ---
    currentUser: function () { return currentUser ? clone(currentUser) : null; },
    signOut: function () { if (doSignOut) doSignOut(); },
    // 允許使用的帳號清單（空 = 全部登入者可用）
    getAllowed: function () { return ((db.settings || SEED.settings).allowedEmails || []).slice(); },

    schedulingTeachers: function () {
      return (db.teachers || []).filter(function (t) { return t.status !== "停用"; })
        .map(function (t) { return { id: t.id, name: t.name, group: t.group, instrument: t.instrument, open: teacherOpen(t) }; });
    },
    schedulingStudents: function () {
      return (db.students || []).map(function (s) {
        return { id: s.id, name: s.name, klass: s.klass, major: { g: s.majorG, i: s.majorI }, minor: { g: s.minorG, i: s.minorI }, cls: studentClassPeriods() };
      });
    },
    schedulingRooms: function () {
      return (db.rooms || []).filter(function (r) { return r.status !== "停用"; })
        .map(function (r) { return { id: r.id, name: r.name, tag: roomTag(r) }; });
    },

    bookings: function () { return clone(db.bookings || []); },
    addBooking: function (b) { return AppStore.upsert("bookings", b); },
    removeBooking: function (id) { AppStore.remove("bookings", id); },

    subscribe: function (fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; },
    resetAll: function () { db = clone(SEED); saveLocal(); emit(); },

    // --- 學年歷史存檔:整體匯出 / 讀取 ---
    exportAll: function () {
      var d = clone(db);
      return {
        app: "music-scheduling", kind: "archive", version: VERSION,
        exportedAt: new Date().toISOString(),
        term: (d.settings ? d.settings.year + "-" + d.settings.term : TERM),
        teachers: d.teachers || [], students: d.students || [], rooms: d.rooms || [],
        bookings: d.bookings || [], rules: d.rules || SEED.rules, settings: d.settings || SEED.settings,
      };
    },
    importAll: function (data) {
      if (!data || typeof data !== "object") throw new Error("檔案格式不正確");
      COLLS.forEach(function (c) { if (Array.isArray(data[c])) AppStore.replace(c, data[c]); });
      if (data.rules && typeof data.rules === "object") AppStore.setRules(data.rules);
      if (data.settings && typeof data.settings === "object") AppStore.setSettings(data.settings);
      return true;
    },
  };
  window.AppStore = AppStore;

  // =========================================================================
  // 雲端模式：偵測設定 → Google 登入 → Firestore 即時同步
  // =========================================================================
  function looksValid(cfg) {
    return cfg && typeof cfg.apiKey === "string" && cfg.apiKey &&
      cfg.apiKey.indexOf("YOUR_") !== 0 && cfg.projectId && cfg.projectId.indexOf("YOUR_") !== 0;
  }

  (function tryFirebase() {
    // 動態載入專案設定;沒有檔案或仍是範例值 → 維持單機模式
    try {
      import("./firebase/firebase-config.js").then(function (m) {
        var cfg = m && m.firebaseConfig;
        if (!looksValid(cfg)) return; // 單機
        mode = "firebase";
        connectFirebase(cfg);
      }).catch(function () { /* 無設定檔 → 單機 */ });
    } catch (e) { /* 不支援動態 import 的環境 → 單機 */ }
  })();

  function connectFirebase(cfg) {
    var V = "https://www.gstatic.com/firebasejs/10.12.2/";
    Promise.all([
      import(V + "firebase-app.js"),
      import(V + "firebase-auth.js"),
      import(V + "firebase-firestore.js"),
    ]).then(function (mods) {
      var appMod = mods[0], authMod = mods[1], fsMod = mods[2];
      var app = appMod.initializeApp(cfg);
      var auth = authMod.getAuth(app);
      var fsdb = fsMod.getFirestore(app);
      var provider = new authMod.GoogleAuthProvider();
      doSignOut = function () { authMod.signOut(auth); };

      var signInFn = function () { authMod.signInWithPopup(auth, provider).catch(showAuthError); };
      // 曾登入過(記號)→ 換頁時不再閃登入卡,直接顯示內容、背景還原登入狀態;
      // 僅首次或真的登出時才顯示登入畫面。
      var wasAuthed = false;
      try { wasAuthed = localStorage.getItem(AUTH_KEY) === "1"; } catch (e) {}
      if (!wasAuthed) showOverlay("connecting");

      authMod.onAuthStateChanged(auth, function (user) {
        if (!user) {
          try { localStorage.removeItem(AUTH_KEY); } catch (e) {}
          currentUser = null; emit();
          showOverlay("signin", signInFn);
          return;
        }
        var email = user.email || "";
        var allowed = (db.settings && db.settings.allowedEmails) || [];
        if (allowed.length && allowed.indexOf(email) < 0) {
          // 已登入但不在允許名單 → 阻擋
          try { localStorage.removeItem(AUTH_KEY); } catch (e) {}
          currentUser = null; emit();
          showOverlay("denied", function () { authMod.signOut(auth); }, email);
          return;
        }
        try { localStorage.setItem(AUTH_KEY, "1"); } catch (e) {}
        currentUser = { name: user.displayName || email || "已登入", email: email, photo: user.photoURL || "" };
        hideOverlay();
        emit(); // 通知 nav.js / 各頁更新使用者資訊
        startSync(fsMod, fsdb);
      });

      // 寫入封裝（雲端）
      fb = {
        setDoc: function (col, rec) { fsMod.setDoc(fsMod.doc(fsdb, col, rec.id), rec).catch(warn); },
        deleteDoc: function (col, id) { fsMod.deleteDoc(fsMod.doc(fsdb, col, id)).catch(warn); },
        setRules: function (rules) { fsMod.setDoc(fsMod.doc(fsdb, "rules", TERM), rules).catch(warn); },
        setSettings: function (s) { fsMod.setDoc(fsMod.doc(fsdb, "meta", "settings"), s).catch(warn); },
        replaceColl: function (col, arr, oldIds) {
          var keep = {}; arr.forEach(function (r) { keep[r.id] = 1; });
          var batch = fsMod.writeBatch(fsdb);
          arr.forEach(function (r) { batch.set(fsMod.doc(fsdb, col, r.id), r); });
          oldIds.forEach(function (id) { if (!keep[id]) batch.delete(fsMod.doc(fsdb, col, id)); });
          batch.commit().catch(warn);
        },
      };
    }).catch(function (e) {
      warn(e); mode = "local"; hideOverlay();
      console.warn("[store] Firebase 載入失敗,改用單機模式。", e);
    });
  }

  var seeded = false;
  function startSync(fsMod, fsdb) {
    // 監聽四個集合
    COLLS.forEach(function (col) {
      fsMod.onSnapshot(fsMod.collection(fsdb, col), function (snap) {
        var arr = []; snap.forEach(function (d) { arr.push(Object.assign({ id: d.id }, d.data())); });
        cacheReplace(col, arr); saveLocal(); emit();
        maybeSeed(fsMod, fsdb, col, arr);
      }, warn);
    });
    // 監聽規則文件
    fsMod.onSnapshot(fsMod.doc(fsdb, "rules", TERM), function (d) {
      if (d.exists()) { db.rules = d.data(); saveLocal(); emit(); }
      else { fsMod.setDoc(fsMod.doc(fsdb, "rules", TERM), clone(SEED.rules)).catch(warn); }
    }, warn);
    // 監聽學校 / 學年設定（含允許帳號名單）
    fsMod.onSnapshot(fsMod.doc(fsdb, "meta", "settings"), function (d) {
      if (d.exists()) {
        db.settings = d.data();
        if (!Array.isArray(db.settings.allowedEmails)) db.settings.allowedEmails = [];
        saveLocal(); emit();
        // 名單更新後即時檢查目前登入者
        var allow = db.settings.allowedEmails;
        if (currentUser && allow.length && allow.indexOf(currentUser.email) < 0) {
          showOverlay("denied", function () { if (doSignOut) doSignOut(); }, currentUser.email);
          currentUser = null; emit();
        }
      } else { fsMod.setDoc(fsMod.doc(fsdb, "meta", "settings"), clone(SEED.settings)).catch(warn); }
    }, warn);
  }

  // 若 teachers 集合為空 → 以固定 id 一次性寫入種子資料（idempotent,不會重複）
  function maybeSeed(fsMod, fsdb, col, arr) {
    if (seeded || col !== "teachers" || arr.length > 0) return;
    seeded = true;
    var batch = fsMod.writeBatch(fsdb);
    COLLS.forEach(function (c) { SEED[c].forEach(function (r) { batch.set(fsMod.doc(fsdb, c, r.id), r); }); });
    batch.set(fsMod.doc(fsdb, "rules", TERM), clone(SEED.rules));
    batch.set(fsMod.doc(fsdb, "meta", "settings"), clone(SEED.settings));
    batch.commit().then(function () { console.info("[store] 已初始化雲端種子資料。"); }).catch(warn);
  }

  function warn(e) { if (e) console.warn("[store] Firestore:", e && e.message ? e.message : e); }
  function showAuthError(e) { warn(e); var b = document.getElementById("__sched_overlay_msg"); if (b) b.textContent = "登入失敗:" + (e && e.message ? e.message : e); }

  // ===== 登入遮罩（雲端模式,已美化） =====
  function el(tag, style, text) { var e = document.createElement(tag); if (style) e.setAttribute("style", style); if (text != null) e.textContent = text; return e; }
  function injectOverlayCSS() {
    if (document.getElementById("__sched_css")) return;
    var s = document.createElement("style"); s.id = "__sched_css";
    s.textContent =
      "@keyframes __sp{to{transform:rotate(360deg)}}" +
      "@keyframes __fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}" +
      "@keyframes __float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}" +
      "#__sched_overlay .nt{position:absolute;color:#fff;opacity:.10;animation:__float 6s ease-in-out infinite}";
    document.head.appendChild(s);
  }
  function googleBtn(label, onClick) {
    var b = el("button", "cursor:pointer;display:inline-flex;align-items:center;gap:11px;border:1px solid #E3DEF0;font-family:inherit;font-size:15px;font-weight:600;color:#3A3550;background:#fff;padding:13px 22px;border-radius:13px;box-shadow:0 6px 18px rgba(40,30,70,.10);transition:transform .12s;");
    b.onmouseover = function () { b.style.transform = "translateY(-2px)"; };
    b.onmouseout = function () { b.style.transform = "none"; };
    var g = document.createElement("span");
    g.innerHTML = '<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.1 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.9 6.1C12.2 13.2 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.1-3.8 6.6-9.4 6.6-16z"/><path fill="#FBBC05" d="M10.4 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.1 0 11.3-2 15-5.5l-7.1-5.5c-2 1.3-4.6 2.1-7.9 2.1-6.4 0-11.8-3.7-13.6-9.4l-7.9 6.1C6.4 42.6 14.6 48 24 48z"/></svg>';
    b.appendChild(g); b.appendChild(el("span", null, label)); b.onclick = onClick; return b;
  }
  function showOverlay(state, action, email) {
    injectOverlayCSS();
    hideOverlay();
    var ov = el("div", "position:fixed;inset:0;z-index:99999;background:radial-gradient(1200px 600px at 80% -10%,#6D54E8 0%,#43356e 45%,#2A2740 100%);display:flex;align-items:center;justify-content:center;font-family:'Noto Sans TC',system-ui,sans-serif;overflow:hidden;");
    ov.id = "__sched_overlay";
    ["♪|7%|12%|150px","♫|72%|18%|110px","♩|16%|74%|130px","♬|82%|68%|120px"].forEach(function (n) {
      var p = n.split("|"); var e = el("div", "left:" + p[1] + ";top:" + p[2] + ";font-size:" + p[3] + ";", p[0]); e.className = "nt"; ov.appendChild(e);
    });
    var card = el("div", "position:relative;background:#fff;border-radius:24px;padding:42px 44px;width:360px;max-width:90vw;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.45);animation:__fadeUp .4s ease both;");
    var logo = el("div", "width:62px;height:62px;margin:0 auto 16px;border-radius:18px;background:linear-gradient(135deg,#6D54E8,#9A4FE0);display:flex;align-items:center;justify-content:center;font-size:30px;box-shadow:0 10px 24px rgba(109,84,232,.4);", "🎼");
    card.appendChild(logo);
    card.appendChild(el("div", "font-size:19px;font-weight:800;color:#2A2740;letter-spacing:.5px;", (window.AppStore && AppStore.schoolFull && AppStore.schoolFull()) || "音樂班個別課排課系統"));
    card.appendChild(el("div", "font-size:12.5px;color:#9A93AC;margin-top:4px;", "個別課排課系統"));
    var sep = el("div", "height:1px;background:#F0ECF7;margin:20px 0;"); card.appendChild(sep);

    if (state === "connecting") {
      var sp = el("div", "width:30px;height:30px;margin:6px auto 14px;border:3px solid #ECE7F6;border-top-color:#6D54E8;border-radius:50%;animation:__sp .8s linear infinite;");
      card.appendChild(sp);
      card.appendChild(el("div", "font-size:13.5px;color:#9A93AC;", "連線雲端中…"));
    } else if (state === "denied") {
      card.appendChild(el("div", "font-size:34px;margin-bottom:8px;", "🔒"));
      card.appendChild(el("div", "font-size:15px;font-weight:700;color:#E23A68;margin-bottom:6px;", "此帳號無使用權限"));
      card.appendChild(el("div", "font-size:12.5px;color:#9A93AC;line-height:1.7;margin-bottom:18px;", (email ? email + "\n" : "") + "請改用已授權的 Google 帳號,或洽教務處將帳號加入白名單。"));
      var sb = el("button", "cursor:pointer;border:none;font-family:inherit;font-size:14px;font-weight:600;color:#fff;background:#2A2740;padding:11px 20px;border-radius:12px;", "換一個帳號登入");
      sb.onclick = action; card.appendChild(sb);
    } else { // signin
      card.appendChild(el("div", "font-size:13.5px;color:#6E6A86;margin-bottom:20px;line-height:1.6;", "請以授權的 Google 帳號登入以存取系統資料"));
      card.appendChild(googleBtn("使用 Google 登入", action));
      var hint = el("div", "font-size:11px;color:#B8B2C6;margin-top:18px;line-height:1.6;", "資料以 Firebase 安全保存,僅授權帳號可存取"); card.appendChild(hint);
    }
    var msg = el("div", "font-size:12px;color:#E23A68;margin-top:14px;white-space:pre-line;"); msg.id = "__sched_overlay_msg"; card.appendChild(msg);
    ov.appendChild(card);
    (document.body || document.documentElement).appendChild(ov);
  }
  function hideOverlay() { var o = document.getElementById("__sched_overlay"); if (o) o.remove(); }
})();
