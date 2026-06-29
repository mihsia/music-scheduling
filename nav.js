// nav.js — 應用外殼：側邊選單（依操作流程分組）+ 登入者資訊 + 全站文字套用
// ---------------------------------------------------------------------------
// 1) 側邊選單：依「總覽 → 設定 → 基本資料 → 排課作業 → 檢視輸出」的流程重建,
//    含分組標題與目前頁面高亮。集中於此檔,各頁不必各自維護。
// 2) 登入者：把側邊底部使用者區換成 Google 大頭貼 + 姓名 + 登出;
//    無側邊欄的頁面則於右上角顯示。
// 3) 文字套用：把模板預設的學校名稱 / 學年學期換成 AppStore 設定值。
// ---------------------------------------------------------------------------
(function () {
  "use strict";

  var FILE = decodeURIComponent((location.pathname.split("/").pop() || ""));
  var TAB = (new URLSearchParams(location.search)).get("tab") || "";

  // ===== 選單定義（依操作流程） =====
  var MENU = [
    { sec: "總覽" },
    { label: "總覽 Dashboard", icon: "📊", file: "Dashboard總覽.dc.html" },
    { sec: "系統設定" },
    { label: "系統設定", icon: "⚙️", file: "系統設定.dc.html" },
    { sec: "基本資料" },
    { label: "外聘老師", icon: "🎻", file: "資料庫管理.dc.html", tab: "teacher" },
    { label: "學生資料", icon: "🎒", file: "資料庫管理.dc.html", tab: "student" },
    { label: "琴房資料", icon: "🚪", file: "資料庫管理.dc.html", tab: "room" },
    { sec: "排課作業" },
    { label: "排課原則", icon: "🛡️", file: "排課原則設定.dc.html" },
    { label: "排課工作台", icon: "🎼", file: "排課工作台.dc.html" },
    { label: "班級課表", icon: "📚", file: "班級課表.dc.html" },
    { sec: "檢視與輸出" },
    { label: "報表中心", icon: "📈", file: "報表中心.dc.html" },
    { sec: "說明" },
    { label: "關於系統", icon: "ℹ️", file: "關於系統.dc.html" },
  ];

  function isActive(it) {
    if (it.file !== FILE) return false;
    if (it.file === "資料庫管理.dc.html") return (TAB || "teacher") === it.tab;
    return true;
  }
  function href(it) { return it.file + (it.tab ? "?tab=" + it.tab : ""); }

  function E(tag, css, text) { var e = document.createElement(tag); if (css) e.setAttribute("style", css); if (text != null) e.textContent = text; return e; }

  // ===== 重建側邊選單 + 使用者區 =====
  function buildNav(nav) {
    nav.textContent = "";
    MENU.forEach(function (it) {
      if (it.sec) {
        nav.appendChild(E("div", "font-size:10.5px;opacity:.38;letter-spacing:1.5px;padding:13px 12px 5px;", it.sec));
        return;
      }
      var on = isActive(it);
      var a = E("a", "display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:12px;font-size:14px;text-decoration:none;color:#fff;cursor:pointer;transition:background .15s;" +
        (on ? "font-weight:600;background:linear-gradient(135deg,#6D54E8,#9A4FE0);box-shadow:0 6px 16px rgba(109,84,232,.4);"
            : "opacity:.72;"));
      a.setAttribute("href", href(it));
      if (!on) { a.onmouseover = function () { a.style.background = "rgba(255,255,255,.08)"; a.style.opacity = "1"; };
                 a.onmouseout = function () { a.style.background = "transparent"; a.style.opacity = ".72"; }; }
      a.appendChild(E("span", "font-size:16px;", it.icon));
      a.appendChild(E("span", null, it.label));
      nav.appendChild(a);
    });
  }

  function buildUser(block) {
    var u = (window.AppStore && AppStore.currentUser) ? AppStore.currentUser() : null;
    block.textContent = "";
    block.setAttribute("style", "margin-top:auto;display:flex;align-items:center;gap:10px;padding:10px 11px;background:rgba(255,255,255,.07);border-radius:14px;");
    // 大頭貼
    var av;
    if (u && u.photo) {
      av = E("img", "width:34px;height:34px;border-radius:50%;flex:none;object-fit:cover;");
      av.setAttribute("src", u.photo); av.setAttribute("referrerpolicy", "no-referrer");
    } else {
      av = E("div", "width:34px;height:34px;border-radius:50%;flex:none;background:#9A4FE0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;color:#fff;", (u && u.name ? u.name[0] : "王"));
    }
    block.appendChild(av);
    var info = E("div", "flex:1;min-width:0;line-height:1.3;");
    info.appendChild(E("div", "font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;", u ? u.name : "王主任"));
    info.appendChild(E("div", "font-size:11px;opacity:.55;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;", u ? (u.email || "已登入") : "教務管理者"));
    block.appendChild(info);
    if (u) {
      var out = E("button", "cursor:pointer;flex:none;border:none;background:rgba(255,255,255,.14);color:#fff;font-family:inherit;font-size:11px;padding:6px 10px;border-radius:9px;", "登出");
      out.onclick = function (e) { e.preventDefault(); e.stopPropagation(); if (AppStore.signOut) AppStore.signOut(); };
      block.appendChild(out);
    }
  }

  // 無側邊欄頁面（手機 / 紙本通知單）→ 右上角使用者晶片
  function buildChip() {
    var u = (window.AppStore && AppStore.currentUser) ? AppStore.currentUser() : null;
    var chip = document.getElementById("__user_chip");
    if (!u) { if (chip) chip.remove(); return; }
    if (!chip) { chip = E("div"); chip.id = "__user_chip";
      chip.setAttribute("style", "position:fixed;top:14px;right:16px;z-index:9000;display:flex;align-items:center;gap:9px;background:#fff;border:1px solid #ECE7F2;padding:6px 8px 6px 6px;border-radius:999px;box-shadow:0 6px 18px rgba(40,30,70,.12);font-family:'Noto Sans TC',system-ui,sans-serif;");
      (document.body || document.documentElement).appendChild(chip);
    }
    chip.textContent = "";
    var av;
    if (u.photo) { av = E("img", "width:28px;height:28px;border-radius:50%;object-fit:cover;"); av.setAttribute("src", u.photo); av.setAttribute("referrerpolicy", "no-referrer"); }
    else { av = E("div", "width:28px;height:28px;border-radius:50%;background:#9A4FE0;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;", u.name[0]); }
    chip.appendChild(av);
    chip.appendChild(E("span", "font-size:12.5px;font-weight:600;color:#2A2740;", u.name));
    var out = E("button", "cursor:pointer;border:none;background:#F1EEF6;color:#6E6A86;font-family:inherit;font-size:11px;padding:5px 10px;border-radius:999px;", "登出");
    out.onclick = function () { if (AppStore.signOut) AppStore.signOut(); };
    chip.appendChild(out);
  }

  function buildBrand(aside) {
    var school = (window.AppStore && AppStore.schoolShort) ? AppStore.schoolShort() : "";
    var divs = aside.querySelectorAll("div");
    for (var i = 0; i < divs.length; i++) {
      var t = (divs[i].textContent || "").trim();
      if (t === "樂排" || t === school) {
        divs[i].textContent = school || "音樂班排課系統";
        divs[i].setAttribute("style", "font-size:15px;font-weight:700;letter-spacing:.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;");
      } else if (t === "音樂班排課系統" || t === "個別課排課系統") {
        divs[i].textContent = "個別課排課系統";
      }
    }
  }

  function applyShell() {
    var u = (window.AppStore && AppStore.currentUser) ? AppStore.currentUser() : null;
    var school = (window.AppStore && AppStore.schoolShort) ? AppStore.schoolShort() : "";
    var sig = FILE + "|" + (u ? (u.name + "|" + u.photo) : "guest") + "|" + school;
    var aside = document.querySelector("aside");
    if (aside) {
      if (aside.dataset.shellSig === sig) return;
      var nav = aside.querySelector("nav");
      var userBlock = aside.querySelector('[style*="margin-top:auto"]');
      if (!userBlock) { var kids = aside.children; userBlock = kids.length ? kids[kids.length - 1] : null; }
      buildBrand(aside);
      if (nav) buildNav(nav);
      if (userBlock) buildUser(userBlock);
      aside.dataset.shellSig = sig;
    } else {
      buildChip();
    }
  }

  // ===== 學校 / 學年文字套用 =====
  function replacements() {
    if (!window.AppStore || !AppStore.getSettings) return [];
    var s = AppStore.getSettings();
    return [
      ["和聲國民中學 音樂班", s.schoolFull],
      ["和聲國中音樂班", s.schoolShort],
      ["114 學年度 第 1 學期", s.year + " 學年度 第 " + s.term + " 學期"],
      ["114 學年度第 1 學期", s.year + " 學年度第 " + s.term + " 學期"],
      ["114-1 學期", s.year + "-" + s.term + " 學期"],
      ["114-1-", s.year + "-" + s.term + "-"],
    ].filter(function (p) { return p[1] && p[0] !== p[1]; });
  }
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, OPTION: 1, A: 0 };
  function applyText() {
    var reps = replacements(); if (!reps.length || !document.body) return;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) { return (!n.parentNode || SKIP[n.parentNode.nodeName]) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; },
    });
    var n, batch = []; while ((n = walker.nextNode())) batch.push(n);
    batch.forEach(function (node) {
      var v = node.nodeValue, nv = v;
      for (var i = 0; i < reps.length; i++) if (nv.indexOf(reps[i][0]) >= 0) nv = nv.split(reps[i][0]).join(reps[i][1]);
      if (nv !== v) node.nodeValue = nv;
    });
  }

  var pending = false;
  function schedule() { if (pending) return; pending = true; (window.requestAnimationFrame || window.setTimeout)(function () { pending = false; applyShell(); applyText(); }, 16); }

  function start() {
    applyShell(); applyText();
    if (window.AppStore && AppStore.subscribe) AppStore.subscribe(schedule);
    try { new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true }); } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
