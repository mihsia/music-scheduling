// firebase-init.js — Firebase 初始化、登入閘門與 Firestore 資料層
// 使用 Firebase v10 模組化 SDK(CDN)。在頁面中以 <script type="module"> 引用。
//
//   import { auth, db, requireLogin, col } from './firebase/firebase-init.js';
//
// 注意:需先建立 firebase/firebase-config.js(見 firebase-config.example.js)。

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, getDocs, doc, setDoc, addDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ---- 登入 ----
export function loginEmail(email, pw) { return signInWithEmailAndPassword(auth, email, pw); }
export function loginGoogle() { return signInWithPopup(auth, new GoogleAuthProvider()); }
export function logout() { return signOut(auth); }

// 在受保護頁面呼叫:未登入導向 login.html
export function requireLogin(redirect = "login.html") {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) { location.href = redirect; return; }
      resolve(user);
    });
  });
}

// ---- Firestore 資料層(簡易封裝) ----
export const col = {
  async list(name) {
    const snap = await getDocs(collection(db, name));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
  async upsert(name, id, data) {
    if (id) { await setDoc(doc(db, name, id), data, { merge: true }); return id; }
    const ref = await addDoc(collection(db, name), data); return ref.id;
  },
  async remove(name, id) { await deleteDoc(doc(db, name, id)); },
};
