import {
  signInWithPopup, getRedirectResult, signOut, onAuthStateChanged,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, collection, getDocs, serverTimestamp, runTransaction,
} from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";

export const authAvailable = !!auth;

/** Roept cb(user|null) aan bij elke wijziging in de inlogstatus. */
export function onAuthChange(cb) {
  if (!auth) { cb(null); return () => {}; }
  return onAuthStateChanged(auth, cb);
}

/** Vertaalt een Firebase Auth-foutcode naar een begrijpelijke melding, zodat
 * een mislukte login nooit stil blijft hangen zonder uitleg. */
export function authErrorMessage(e) {
  const code = e && e.code;
  if (code === "auth/unauthorized-domain")
    return "Dit domein staat nog niet toegestaan in Firebase (Authentication → Settings → Authorized domains).";
  if (code === "auth/popup-blocked")
    return "De inlog-pop-up werd door de browser geblokkeerd. Sta pop-ups toe voor deze site en probeer opnieuw.";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request")
    return "Inloggen geannuleerd — het inlogvenster is gesloten voordat het klaar was.";
  if (code === "auth/network-request-failed")
    return "Geen verbinding met Google — controleer je internetverbinding.";
  if (code === "auth/web-storage-unsupported" || code === "auth/operation-not-supported-in-this-environment")
    return "Deze browser/app-omgeving ondersteunt inloggen niet goed. Probeer het in Safari of Chrome zelf (niet in een ingebouwde app-browser).";
  return "Inloggen is niet gelukt" + (code ? ` (${code})` : "") + ". Probeer het nog eens.";
}

/** Start Google-login. Gebruikt een pop-up: die geeft direct een resultaat of
 * duidelijke foutmelding terug op dezelfde pagina. (Een redirect bleek in de
 * praktijk regelmatig stil vast te lopen — de pagina komt terug na het
 * inloggen bij Google, maar het resultaat wordt niet altijd herkend, vooral
 * door hoe browsers opslag tussen de omleiding bewaren. Een pop-up heeft dat
 * probleem niet.) */
export async function signIn() {
  if (!auth) throw new Error("Firebase is niet beschikbaar.");
  await signInWithPopup(auth, googleProvider);
}

/** Vangt (indien aanwezig) het resultaat op van een eerdere signInWithRedirect
 * — bewaard voor het geval een browser toch alsnog naar een redirect
 * terugvalt. Gooit de echte fout door in plaats van hem stil te negeren, zodat
 * de aanroeper (main.jsx) hem kan tonen. */
export async function finishSignInRedirect() {
  if (!auth) return null;
  return await getRedirectResult(auth);
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

/** Maakt een nieuw huwelijksproject aan voor `user` en koppelt de gebruiker
 * eraan als eigenaar + eerste lid. */
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
