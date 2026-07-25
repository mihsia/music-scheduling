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
    { k: "p1", label: "3", time: "08:30" },
    { k: "p2", label: "4", time: "09:20" },
    { k: "p3", label: "5", time: "10:10" },
    { k: "p4", label: "6", time: "11:00" },
    { k: "lunch", label: "午", time: "12:00", lunch: true },
    { k: "p6", label: "7", time: "13:10" },
    { k: "p7", label: "8", time: "14:10" },
    { k: "p8", label: "9", time: "15:10" },
    { k: "p9", label: "10", time: "16:10" },
  ];
  var AM = ["p1", "p2", "p3", "p4"];
  var PM = ["p6", "p7", "p8", "p9"];
  var DAYS = ["一", "二", "三", "四", "五"];
  var GROUP_LABEL = { strings: "弦樂", piano: "鋼琴", winds: "管樂", perc: "擊樂" };

  // ===== 種子資料（單機首次開啟、或雲端集合為空時寫入） =====
  var SEED = {
    version: VERSION, term: TERM,
    teachers: [
      { id: "t1", name: "江琬仁", group: "strings", instrument: "大提琴", days: ["一"], slot: "上午", phone: "", status: "啟用" },
      { id: "t2", name: "王乃昕", group: "piano", instrument: "鋼琴", days: ["一"], slot: "上午", phone: "", status: "啟用" },
      { id: "t3", name: "陳永禎", group: "piano", instrument: "鋼琴", days: ["一"], slot: "上午", phone: "", status: "啟用" },
      { id: "t4", name: "李毓寧", group: "strings", instrument: "大提琴", days: ["一"], slot: "上午", phone: "", status: "啟用" },
      { id: "t5", name: "林于涵", group: "piano", instrument: "鋼琴", days: ["一"], slot: "上午", phone: "", status: "啟用" },
      { id: "t6", name: "張韵品", group: "strings", instrument: "中提琴", days: ["一"], slot: "上午", phone: "", status: "啟用" },
      { id: "t7", name: "鄒銘軒", group: "piano", instrument: "鋼琴", days: ["一"], slot: "上午", phone: "", status: "啟用" },
      { id: "t8", name: "唐苡璿", group: "strings", instrument: "小提琴", days: ["一"], slot: "上午", phone: "", status: "啟用" },
      { id: "t9", name: "呂明芳", group: "piano", instrument: "鋼琴", days: ["一"], slot: "上午", phone: "", status: "啟用" },
      { id: "t10", name: "林淑敏", group: "strings", instrument: "小提琴", days: ["一"], slot: "上午", phone: "", status: "啟用" },
      { id: "t11", name: "吳瑞宗", group: "perc", instrument: "打擊", days: ["一"], slot: "上午", phone: "", status: "啟用" },
      { id: "t12", name: "黃靖茹", group: "perc", instrument: "打擊", days: ["一"], slot: "上午", phone: "", status: "啟用" },
      { id: "t13", name: "柯宥帆", group: "strings", instrument: "小提琴", days: ["二"], slot: "上午", phone: "", status: "啟用" },
      { id: "t14", name: "蔡珮君", group: "piano", instrument: "鋼琴", days: ["二"], slot: "上午", phone: "", status: "啟用" },
      { id: "t15", name: "林蘭君", group: "piano", instrument: "鋼琴", days: ["二"], slot: "上午", phone: "", status: "啟用" },
      { id: "t16", name: "蕭如軒", group: "piano", instrument: "鋼琴", days: ["二"], slot: "上午", phone: "", status: "啟用" },
      { id: "t17", name: "孫佳鈴", group: "winds", instrument: "長笛", days: ["二"], slot: "上午", phone: "", status: "啟用" },
      { id: "t18", name: "洪毅", group: "piano", instrument: "鋼琴", days: ["二"], slot: "上午", phone: "", status: "啟用" },
      { id: "t19", name: "江育誠", group: "strings", instrument: "小提琴", days: ["二"], slot: "上午", phone: "", status: "啟用" },
      { id: "t20", name: "黃渝沁", group: "strings", instrument: "小提琴", days: ["二"], slot: "上午", phone: "", status: "啟用" },
      { id: "t21", name: "陳怡真", group: "winds", instrument: "單簧管", days: ["二"], slot: "上午", phone: "", status: "啟用" },
      { id: "t22", name: "湯雯茜", group: "piano", instrument: "鋼琴", days: ["二"], slot: "上午", phone: "", status: "啟用" },
      { id: "t23", name: "賴美如", group: "piano", instrument: "鋼琴", days: ["二"], slot: "上午", phone: "", status: "啟用" },
      { id: "t24", name: "黃毓瑾", group: "strings", instrument: "低音提琴", days: ["二"], slot: "上午", phone: "", status: "啟用" },
    ],
    students: [
      { id: "s1", name: "劉相汝", klass: "6音", majorG: "strings", majorI: "大提琴", minorG: "piano", minorI: "鋼琴", sched: "已排" },
      { id: "s2", name: "楊沂菲", klass: "5音", majorG: "piano", majorI: "鋼琴", minorG: "strings", minorI: "大提琴", sched: "已排" },
      { id: "s3", name: "林軾穎", klass: "5音", majorG: "piano", majorI: "鋼琴", minorG: "strings", minorI: "大提琴", sched: "已排" },
      { id: "s4", name: "王樂樂", klass: "4音", majorG: "piano", majorI: "鋼琴", minorG: "strings", minorI: "大提琴", sched: "已排" },
      { id: "s5", name: "藍諭佳", klass: "4音", majorG: "piano", majorI: "鋼琴", minorG: "perc", minorI: "打擊", sched: "已排" },
      { id: "s6", name: "簡廷宇", klass: "5音", majorG: "strings", majorI: "大提琴", minorG: "piano", minorI: "鋼琴", sched: "已排" },
      { id: "s7", name: "曾予糧", klass: "4音", majorG: "piano", majorI: "鋼琴", minorG: "strings", minorI: "大提琴", sched: "已排" },
      { id: "s8", name: "劉鈺暄", klass: "3音", majorG: "piano", majorI: "鋼琴", minorG: "strings", minorI: "小提琴", sched: "已排" },
      { id: "s9", name: "張牧恆", klass: "3音", majorG: "strings", majorI: "小提琴", minorG: "piano", minorI: "鋼琴", sched: "已排" },
      { id: "s10", name: "丁安家", klass: "5音", majorG: "piano", majorI: "鋼琴", minorG: "strings", minorI: "小提琴", sched: "已排" },
      { id: "s11", name: "曾予愛", klass: "6音", majorG: "piano", majorI: "鋼琴", minorG: "strings", minorI: "小提琴", sched: "已排" },
      { id: "s12", name: "蔡定恒", klass: "4音", majorG: "strings", majorI: "小提琴", minorG: "piano", minorI: "鋼琴", sched: "已排" },
      { id: "s13", name: "李楷謙", klass: "4音", majorG: "strings", majorI: "中提琴", minorG: "piano", minorI: "鋼琴", sched: "已排" },
      { id: "s14", name: "張景評", klass: "3音", majorG: "piano", majorI: "鋼琴", minorG: "strings", minorI: "小提琴", sched: "已排" },
      { id: "s15", name: "陳宇荷", klass: "3音", majorG: "strings", majorI: "小提琴", minorG: "piano", minorI: "鋼琴", sched: "已排" },
      { id: "s16", name: "陳珆珊", klass: "3音", majorG: "piano", majorI: "鋼琴", minorG: "strings", minorI: "小提琴", sched: "已排" },
      { id: "s17", name: "周秀帆", klass: "3音", majorG: "strings", majorI: "小提琴", minorG: "piano", minorI: "鋼琴", sched: "已排" },
      { id: "s18", name: "吳夏儒", klass: "6音", majorG: "strings", majorI: "小提琴", minorG: "piano", minorI: "鋼琴", sched: "已排" },
      { id: "s19", name: "李品樂", klass: "6音", majorG: "piano", majorI: "鋼琴", minorG: "perc", minorI: "打擊", sched: "已排" },
      { id: "s20", name: "劉昊恩", klass: "3音", majorG: "piano", majorI: "鋼琴", minorG: "strings", minorI: "小提琴", sched: "已排" },
      { id: "s21", name: "黃祥沐", klass: "5音", majorG: "strings", majorI: "小提琴", minorG: "piano", minorI: "鋼琴", sched: "已排" },
      { id: "s22", name: "桂唯恩", klass: "5音", majorG: "perc", majorI: "打擊", minorG: "piano", minorI: "鋼琴", sched: "已排" },
      { id: "s23", name: "陳宇修", klass: "3音", majorG: "piano", majorI: "鋼琴", minorG: "perc", minorI: "打擊", sched: "已排" },
      { id: "s24", name: "李育合", klass: "3音", majorG: "perc", majorI: "打擊", minorG: "piano", minorI: "鋼琴", sched: "已排" },
      { id: "s25", name: "林品妤", klass: "6音", majorG: "strings", majorI: "小提琴", minorG: "piano", minorI: "鋼琴", sched: "已排" },
      { id: "s26", name: "林思加", klass: "3音", majorG: "strings", majorI: "小提琴", minorG: "piano", minorI: "鋼琴", sched: "已排" },
      { id: "s27", name: "李宣慈", klass: "4音", majorG: "piano", majorI: "鋼琴", minorG: "winds", minorI: "單簧管", sched: "已排" },
      { id: "s28", name: "陳妍芯", klass: "3音", majorG: "strings", majorI: "小提琴", minorG: "piano", minorI: "鋼琴", sched: "已排" },
      { id: "s29", name: "余可昀", klass: "6音", majorG: "winds", majorI: "長笛", minorG: "piano", minorI: "鋼琴", sched: "已排" },
      { id: "s30", name: "林畇霏", klass: "4音", majorG: "winds", majorI: "長笛", minorG: "piano", minorI: "鋼琴", sched: "已排" },
      { id: "s31", name: "李睦義", klass: "4音", majorG: "piano", majorI: "鋼琴", minorG: "strings", minorI: "低音提琴", sched: "已排" },
      { id: "s32", name: "曹景堯", klass: "4音", majorG: "piano", majorI: "鋼琴", minorG: "winds", minorI: "單簧管", sched: "已排" },
      { id: "s33", name: "楊昕樂", klass: "4音", majorG: "strings", majorI: "小提琴", minorG: "piano", minorI: "鋼琴", sched: "已排" },
      { id: "s34", name: "李小多", klass: "6音", majorG: "piano", majorI: "鋼琴", minorG: "strings", minorI: "小提琴", sched: "已排" },
      { id: "s35", name: "李小羽", klass: "6音", majorG: "piano", majorI: "鋼琴", minorG: "strings", minorI: "低音提琴", sched: "已排" },
    ],
    rooms: [
      { id: "R1", name: "琴房一", floor: "—", equip: "個別課琴房", groups: ["strings"], slot: "上午", status: "啟用" },
      { id: "R2", name: "琴房二", floor: "—", equip: "個別課琴房", groups: ["piano"], slot: "上午", status: "啟用" },
      { id: "R3", name: "琴房三", floor: "—", equip: "個別課琴房", groups: ["piano"], slot: "上午", status: "啟用" },
      { id: "R4", name: "琴房四", floor: "—", equip: "個別課琴房", groups: ["strings", "piano"], slot: "上午", status: "啟用" },
      { id: "R5", name: "琴房五", floor: "—", equip: "個別課琴房", groups: ["piano", "winds"], slot: "上午", status: "啟用" },
      { id: "R6", name: "琴房六", floor: "—", equip: "個別課琴房", groups: ["strings", "piano"], slot: "上午", status: "啟用" },
      { id: "R7", name: "琴房七", floor: "—", equip: "個別課琴房", groups: ["piano", "strings"], slot: "上午", status: "啟用" },
      { id: "R8", name: "琴房八", floor: "—", equip: "個別課琴房", groups: ["strings", "piano"], slot: "上午", status: "啟用" },
      { id: "R9", name: "琴房九", floor: "—", equip: "個別課琴房", groups: ["winds"], slot: "上午", status: "啟用" },
      { id: "R10", name: "琴房十", floor: "—", equip: "個別課琴房", groups: ["strings", "piano"], slot: "上午", status: "啟用" },
      { id: "R11", name: "琴房十一", floor: "—", equip: "個別課琴房", groups: ["piano"], slot: "上午", status: "啟用" },
      { id: "R13", name: "琴房十三", floor: "—", equip: "個別課琴房", groups: ["piano", "strings"], slot: "上午", status: "啟用" },
      { id: "R14", name: "琴房十四", floor: "—", equip: "個別課琴房", groups: ["strings"], slot: "上午", status: "啟用" },
      { id: "R15", name: "三樓大合奏教室", floor: "3F", equip: "個別課琴房", groups: ["perc"], slot: "上午", status: "啟用" },
      { id: "R16", name: "三樓弦A教室", floor: "3F", equip: "個別課琴房", groups: ["perc"], slot: "上午", status: "啟用" },
      { id: "R17", name: "二樓團輔教室", floor: "2F", equip: "個別課琴房", groups: ["strings"], slot: "上午", status: "啟用" },
      { id: "R18", name: "二樓分部教室", floor: "2F", equip: "個別課琴房", groups: ["strings"], slot: "上午", status: "啟用" },
    ],
    bookings: [
      { id: "bk1", day: "一", k: "p1", teacherId: "t1", studentId: "s1", student: "劉相汝", room: "琴房一", type: "主修", term: TERM },
      { id: "bk2", day: "一", k: "p2", teacherId: "t1", studentId: "s2", student: "楊沂菲", room: "琴房一", type: "副修", term: TERM },
      { id: "bk3", day: "一", k: "p3", teacherId: "t1", studentId: "s3", student: "林軾穎", room: "琴房一", type: "副修", term: TERM },
      { id: "bk4", day: "一", k: "p4", teacherId: "t1", studentId: "s4", student: "王樂樂", room: "琴房一", type: "副修", term: TERM },
      { id: "bk5", day: "一", k: "p1", teacherId: "t2", studentId: "s5", student: "藍諭佳", room: "琴房二", type: "主修", term: TERM },
      { id: "bk6", day: "一", k: "p2", teacherId: "t2", studentId: "s4", student: "王樂樂", room: "琴房二", type: "主修", term: TERM },
      { id: "bk7", day: "一", k: "p3", teacherId: "t2", studentId: "s6", student: "簡廷宇", room: "琴房二", type: "副修", term: TERM },
      { id: "bk8", day: "一", k: "p4", teacherId: "t2", studentId: "s7", student: "曾予糧", room: "琴房二", type: "主修", term: TERM },
      { id: "bk9", day: "一", k: "p1", teacherId: "t3", studentId: "s8", student: "劉鈺暄", room: "琴房三", type: "主修", term: TERM },
      { id: "bk10", day: "一", k: "p2", teacherId: "t3", studentId: "s9", student: "張牧恆", room: "琴房三", type: "主修", term: TERM },
      { id: "bk11", day: "一", k: "p1", teacherId: "t4", studentId: "s6", student: "簡廷宇", room: "琴房四", type: "主修", term: TERM },
      { id: "bk12", day: "一", k: "p2", teacherId: "t4", studentId: "s7", student: "曾予糧", room: "琴房四", type: "副修", term: TERM },
      { id: "bk13", day: "一", k: "p1", teacherId: "t5", studentId: "s3", student: "林軾穎", room: "琴房五", type: "主修", term: TERM },
      { id: "bk14", day: "一", k: "p2", teacherId: "t5", studentId: "s10", student: "丁安家", room: "琴房五", type: "主修", term: TERM },
      { id: "bk15", day: "一", k: "p3", teacherId: "t5", studentId: "s11", student: "曾予愛", room: "琴房五", type: "主修", term: TERM },
      { id: "bk16", day: "一", k: "p4", teacherId: "t5", studentId: "s12", student: "蔡定恒", room: "琴房五", type: "副修", term: TERM },
      { id: "bk17", day: "一", k: "p1", teacherId: "t6", studentId: "s13", student: "李楷謙", room: "琴房六", type: "主修", term: TERM },
      { id: "bk18", day: "一", k: "p1", teacherId: "t7", studentId: "s14", student: "張景評", room: "琴房七", type: "主修", term: TERM },
      { id: "bk19", day: "一", k: "p2", teacherId: "t7", studentId: "s15", student: "陳宇荷", room: "琴房七", type: "副修", term: TERM },
      { id: "bk20", day: "一", k: "p1", teacherId: "t8", studentId: "s15", student: "陳宇荷", room: "琴房十", type: "主修", term: TERM },
      { id: "bk21", day: "一", k: "p2", teacherId: "t8", studentId: "s16", student: "陳珆珊", room: "琴房十", type: "副修", term: TERM },
      { id: "bk22", day: "一", k: "p3", teacherId: "t8", studentId: "s17", student: "周秀帆", room: "琴房十", type: "主修", term: TERM },
      { id: "bk23", day: "一", k: "p1", teacherId: "t9", studentId: "s18", student: "吳夏儒", room: "琴房十三", type: "副修", term: TERM },
      { id: "bk24", day: "一", k: "p2", teacherId: "t9", studentId: "s17", student: "周秀帆", room: "琴房十三", type: "副修", term: TERM },
      { id: "bk25", day: "一", k: "p3", teacherId: "t9", studentId: "s19", student: "李品樂", room: "琴房十三", type: "主修", term: TERM },
      { id: "bk26", day: "一", k: "p4", teacherId: "t9", studentId: "s20", student: "劉昊恩", room: "琴房十三", type: "主修", term: TERM },
      { id: "bk27", day: "一", k: "p1", teacherId: "t10", studentId: "s21", student: "黃祥沐", room: "琴房十四", type: "主修", term: TERM },
      { id: "bk28", day: "一", k: "p2", teacherId: "t10", studentId: "s12", student: "蔡定恒", room: "琴房十四", type: "主修", term: TERM },
      { id: "bk29", day: "一", k: "p3", teacherId: "t10", studentId: "s18", student: "吳夏儒", room: "琴房十四", type: "主修", term: TERM },
      { id: "bk30", day: "一", k: "p4", teacherId: "t10", studentId: "s10", student: "丁安家", room: "琴房十四", type: "副修", term: TERM },
      { id: "bk31", day: "一", k: "p1", teacherId: "t11", studentId: "s19", student: "李品樂", room: "三樓大合奏教室", type: "副修", term: TERM },
      { id: "bk32", day: "一", k: "p2", teacherId: "t11", studentId: "s23", student: "陳宇修", room: "三樓大合奏教室", type: "副修", term: TERM },
      { id: "bk33", day: "一", k: "p3", teacherId: "t11", studentId: "s22", student: "桂唯恩", room: "三樓大合奏教室", type: "主修", term: TERM },
      { id: "bk34", day: "一", k: "p1", teacherId: "t12", studentId: "s24", student: "李育合", room: "三樓弦A教室", type: "主修", term: TERM },
      { id: "bk35", day: "一", k: "p2", teacherId: "t12", studentId: "s5", student: "藍諭佳", room: "三樓弦A教室", type: "副修", term: TERM },
      { id: "bk36", day: "二", k: "p1", teacherId: "t13", studentId: "s25", student: "林品妤", room: "琴房一", type: "主修", term: TERM },
      { id: "bk37", day: "二", k: "p2", teacherId: "t13", studentId: "s26", student: "林思加", room: "琴房一", type: "主修", term: TERM },
      { id: "bk38", day: "二", k: "p3", teacherId: "t13", studentId: "s9", student: "張牧恆", room: "琴房一", type: "主修", term: TERM },
      { id: "bk39", day: "二", k: "p4", teacherId: "t13", studentId: "s8", student: "劉鈺暄", room: "琴房一", type: "副修", term: TERM },
      { id: "bk40", day: "二", k: "p1", teacherId: "t14", studentId: "s27", student: "李宣慈", room: "琴房二", type: "主修", term: TERM },
      { id: "bk41", day: "二", k: "p2", teacherId: "t14", studentId: "s28", student: "陳妍芯", room: "琴房二", type: "副修", term: TERM },
      { id: "bk42", day: "二", k: "p3", teacherId: "t14", studentId: "s21", student: "黃祥沐", room: "琴房二", type: "副修", term: TERM },
      { id: "bk43", day: "二", k: "p4", teacherId: "t14", studentId: "s29", student: "余可昀", room: "琴房二", type: "副修", term: TERM },
      { id: "bk44", day: "二", k: "p1", teacherId: "t15", studentId: "s30", student: "林畇霏", room: "琴房三", type: "副修", term: TERM },
      { id: "bk45", day: "二", k: "p2", teacherId: "t15", studentId: "s22", student: "桂唯恩", room: "琴房三", type: "副修", term: TERM },
      { id: "bk46", day: "二", k: "p1", teacherId: "t16", studentId: "s31", student: "李睦義", room: "琴房四", type: "主修", term: TERM },
      { id: "bk47", day: "二", k: "p2", teacherId: "t16", studentId: "s32", student: "曹景堯", room: "琴房四", type: "主修", term: TERM },
      { id: "bk48", day: "二", k: "p3", teacherId: "t16", studentId: "s1", student: "劉相汝", room: "琴房四", type: "副修", term: TERM },
      { id: "bk49", day: "二", k: "p4", teacherId: "t16", studentId: "s13", student: "李楷謙", room: "琴房四", type: "副修", term: TERM },
      { id: "bk50", day: "二", k: "p1", teacherId: "t17", studentId: "s30", student: "林畇霏", room: "琴房五", type: "主修", term: TERM },
      { id: "bk51", day: "二", k: "p2", teacherId: "t17", studentId: "s29", student: "余可昀", room: "琴房五", type: "主修", term: TERM },
      { id: "bk52", day: "二", k: "p1", teacherId: "t18", studentId: "s24", student: "李育合", room: "琴房六", type: "副修", term: TERM },
      { id: "bk53", day: "二", k: "p1", teacherId: "t19", studentId: "s20", student: "劉昊恩", room: "琴房七", type: "副修", term: TERM },
      { id: "bk54", day: "二", k: "p2", teacherId: "t19", studentId: "s14", student: "張景評", room: "琴房七", type: "副修", term: TERM },
      { id: "bk55", day: "二", k: "p1", teacherId: "t20", studentId: "s11", student: "曾予愛", room: "琴房十三", type: "副修", term: TERM },
      { id: "bk56", day: "二", k: "p2", teacherId: "t20", studentId: "s33", student: "楊昕樂", room: "琴房十三", type: "副修", term: TERM },
      { id: "bk57", day: "二", k: "p3", teacherId: "t20", studentId: "s34", student: "李小多", room: "琴房十三", type: "副修", term: TERM },
      { id: "bk58", day: "二", k: "p4", teacherId: "t20", studentId: "s28", student: "陳妍芯", room: "琴房十三", type: "主修", term: TERM },
      { id: "bk59", day: "二", k: "p1", teacherId: "t21", studentId: "s27", student: "李宣慈", room: "琴房九", type: "副修", term: TERM },
      { id: "bk60", day: "二", k: "p2", teacherId: "t21", studentId: "s32", student: "曹景堯", room: "琴房九", type: "副修", term: TERM },
      { id: "bk61", day: "二", k: "p1", teacherId: "t22", studentId: "s34", student: "李小多", room: "琴房十", type: "主修", term: TERM },
      { id: "bk62", day: "二", k: "p2", teacherId: "t22", studentId: "s35", student: "李小羽", room: "琴房十", type: "主修", term: TERM },
      { id: "bk63", day: "二", k: "p3", teacherId: "t22", studentId: "s25", student: "林品妤", room: "琴房十", type: "副修", term: TERM },
      { id: "bk64", day: "二", k: "p4", teacherId: "t22", studentId: "s26", student: "林思加", room: "琴房十", type: "副修", term: TERM },
      { id: "bk65", day: "二", k: "p1", teacherId: "t23", studentId: "s16", student: "陳珆珊", room: "琴房八", type: "主修", term: TERM },
      { id: "bk66", day: "二", k: "p2", teacherId: "t23", studentId: "s23", student: "陳宇修", room: "琴房八", type: "主修", term: TERM },
      { id: "bk67", day: "二", k: "p3", teacherId: "t23", studentId: "s2", student: "楊沂菲", room: "琴房八", type: "主修", term: TERM },
      { id: "bk68", day: "二", k: "p4", teacherId: "t23", studentId: "s33", student: "楊昕樂", room: "琴房八", type: "副修", term: TERM },
      { id: "bk69", day: "二", k: "p1", teacherId: "t24", studentId: "s31", student: "李睦義", room: "二樓分部教室", type: "副修", term: TERM },
      { id: "bk70", day: "二", k: "p3", teacherId: "t24", studentId: "s35", student: "李小羽", room: "二樓團輔教室", type: "副修", term: TERM },
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
  // 目前尚無各生真實班級正課時段資料,先不標記衝突(避免把上午個別課節次誤判為正課衝突)
  function studentClassPeriods() { return {}; }

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
