import {
  signInWithRedirect, signInWithPopup, getRedirectResult, signOut, onAuthStateChanged,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, collection, getDocs, addDoc, serverTimestamp, runTransaction,
} from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";

export const authAvailable = !!auth;

/** Roept cb(user|null) aan bij elke wijziging in de inlogstatus. */
export function onAuthChange(cb) {
  if (!auth) { cb(null); return () => {}; }
  return onAuthStateChanged(auth, cb);
}

/** Start Google-login. Gebruikt een redirect (werkt betrouwbaar als PWA op
 * het beginscherm), met popup als terugval voor omgevingen waar redirect
 * niet lekker werkt (bv. desktop-browser in dit voorbeeld). */
export async function signIn() {
  if (!auth) throw new Error("Firebase is niet beschikbaar.");
  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (e) {
    await signInWithPopup(auth, googleProvider);
  }
}

export async function finishSignInRedirect() {
  if (!auth) return null;
  try { return await getRedirectResult(auth); } catch { return null; }
}

export async function signOutUser() {
  if (!auth) return;
  await signOut(auth);
}

/** Geeft het weddingId dat aan deze gebruiker gekoppeld is, of null. */
export async function getUserWeddingId(uid) {
  if (!db) return null;
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data().weddingId || null : null;
}

function randomCode(len = 7) {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789"; // geen verwarrende tekens (0/o, 1/l/i)
  let s = "";
  for (let i = 0; i < len; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

/** Maakt een nieuw, leeg (of gemigreerd) huwelijksproject aan voor `user` en
 * koppelt de gebruiker eraan als eigenaar + eerste lid. */
export async function createWedding(user, initialJson) {
  if (!db) throw new Error("Firebase is niet beschikbaar.");
  const weddingRef = doc(collection(db, "weddings"));
  await setDoc(weddingRef, {
    ownerUid: user.uid,
    ownerEmail: user.email || "",
    createdAt: serverTimestamp(),
    json: initialJson || null,
    writer: "migration",
    ts: serverTimestamp(),
  });
  await setDoc(doc(db, "weddings", weddingRef.id, "members", user.uid), {
    email: user.email || "",
    displayName: user.displayName || "",
    joinedAt: serverTimestamp(),
  });
  await setDoc(doc(db, "users", user.uid), { email: user.email || "", weddingId: weddingRef.id }, { merge: true });
  return weddingRef.id;
}

/** Maakt een (nieuwe) uitnodigingscode voor een bestaand project. */
export async function createInviteCode(weddingId, user) {
  if (!db) throw new Error("Firebase is niet beschikbaar.");
  const code = randomCode();
  await setDoc(doc(db, "invites", code), {
    weddingId,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    used: false,
  });
  return code;
}

/** De uitgenodigde partner: sluit aan bij een project met een uitnodigingscode. */
export async function joinWeddingWithInviteCode(user, rawCode) {
  if (!db) throw new Error("Firebase is niet beschikbaar.");
  const code = (rawCode || "").trim().toLowerCase();
  if (!code) throw new Error("Vul een uitnodigingscode in.");
  const inviteRef = doc(db, "invites", code);
  const weddingId = await runTransaction(db, async (tx) => {
    const inviteSnap = await tx.get(inviteRef);
    if (!inviteSnap.exists()) throw new Error("Deze uitnodigingscode bestaat niet (meer).");
    const invite = inviteSnap.data();
    if (invite.used) throw new Error("Deze uitnodigingscode is al gebruikt.");
    const memberRef = doc(db, "weddings", invite.weddingId, "members", user.uid);
    tx.set(memberRef, { email: user.email || "", displayName: user.displayName || "", joinedAt: serverTimestamp(), inviteCode: code });
    tx.update(inviteRef, { used: true, usedBy: user.uid, usedAt: serverTimestamp() });
    return invite.weddingId;
  });
  await setDoc(doc(db, "users", user.uid), { email: user.email || "", weddingId }, { merge: true });
  return weddingId;
}

/** Leden van een project ophalen (voor het uitnodigen-scherm). */
export async function listMembers(weddingId) {
  if (!db) return [];
  const snap = await getDocs(collection(db, "weddings", weddingId, "members"));
  const out = [];
  snap.forEach((d) => out.push({ uid: d.id, ...d.data() }));
  return out;
}

/** Eenmalig alle foto's uit het oude gedeelde-code-document ophalen. */
async function loadOldPhotos(oldCode) {
  if (!db) return [];
  const snap = await getDocs(collection(db, "planners", oldCode, "photos"));
  const out = [];
  snap.forEach((d) => {
    const v = d.data();
    if (v && v.dataUrl) out.push({ dataUrl: v.dataUrl, w: v.w || 0, h: v.h || 0 });
  });
  return out;
}

/**
 * Zet de gegevens van de oude gedeelde-code-app (planners/{oldCode}) over
 * naar een nieuw, aan Google-accounts gekoppeld project — inclusief foto's.
 * Geeft het nieuwe weddingId terug.
 */
export async function migrateFromOldCode(user, oldCode) {
  if (!db) throw new Error("Firebase is niet beschikbaar.");
  const code = (oldCode || "").trim().toLowerCase();
  if (!code) throw new Error("Vul de oude gedeelde code in.");
  const oldSnap = await getDoc(doc(db, "planners", code));
  if (!oldSnap.exists() || oldSnap.data().json == null) {
    throw new Error("Geen bestaande gegevens gevonden onder die code.");
  }
  const json = oldSnap.data().json;
  const weddingId = await createWedding(user, json);
  const photos = await loadOldPhotos(code);
  for (const p of photos) {
    await addDoc(collection(db, "weddings", weddingId, "photos"), {
      dataUrl: p.dataUrl, w: p.w, h: p.h, createdAt: serverTimestamp(),
    });
  }
  return weddingId;
}
