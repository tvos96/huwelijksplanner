import {
  doc, getDoc, setDoc, onSnapshot, serverTimestamp,
  collection, addDoc, deleteDoc, query, orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

const LS_CLIENT = "ti-planner-client";

function getClientId() {
  let c = localStorage.getItem(LS_CLIENT);
  if (!c) {
    c = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(LS_CLIENT, c);
  }
  return c;
}

const CLIENT = getClientId();

// true zodra live-sync (Firebase) beschikbaar is
export const syncAvailable = !!db;

/**
 * Maakt een gedeelde-planner-store voor één "code". Alle gegevens (de hele
 * planner-JSON) staan in het document planners/{code}; foto's staan als losse
 * documenten in de subcollectie planners/{code}/photos zodat ze niet de hele
 * planner-listener zwaar maken.
 */
export function createPlannerStore(code) {
  let cache = null;
  let selfWriteAt = 0;
  const ref = db ? doc(db, "planners", code) : null;

  async function load() {
    if (!ref) return null;
    const snap = await getDoc(ref);
    cache = snap.exists() && snap.data().json != null ? snap.data().json : null;
    return cache;
  }

  async function save(value) {
    if (!ref) return;
    if (value === cache) return; // geen echte wijziging -> niet schrijven (voorkomt loops)
    cache = value;
    selfWriteAt = Date.now();
    await setDoc(ref, { json: value, writer: CLIENT, ts: serverTimestamp() });
  }

  // onChange(json) wordt alleen aangeroepen bij een wijziging die van de ANDER komt.
  function subscribe(onChange) {
    if (!ref) return () => {};
    let first = true;
    return onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        const incoming = d.json != null ? d.json : null;
        if (first) {
          first = false;
          if (incoming !== null) cache = incoming;
          return;
        }
        if (d.writer === CLIENT && Date.now() - selfWriteAt < 4000) {
          cache = incoming; // eigen echo, negeren
          return;
        }
        if (incoming === cache) return; // niets veranderd
        cache = incoming;
        onChange(incoming);
      },
      (err) => console.error("Firestore listener fout:", err)
    );
  }

  function photosRef() {
    return collection(db, "planners", code, "photos");
  }

  function subscribePhotos(onChange) {
    if (!db) return () => {};
    try {
      const qy = query(photosRef(), orderBy("createdAt", "asc"));
      return onSnapshot(
        qy,
        (snap) => {
          const list = [];
          snap.forEach((d) => {
            const v = d.data();
            if (v && v.dataUrl) list.push({ id: d.id, src: v.dataUrl, w: v.w || 0, h: v.h || 0 });
          });
          onChange(list);
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  }

  async function addPhoto(dataUrl, w, h) {
    if (!db) throw new Error("Foto's toevoegen werkt alleen in de online (Netlify) app.");
    await addDoc(photosRef(), { dataUrl, w, h, createdAt: serverTimestamp() });
  }

  async function deletePhoto(id) {
    if (!db) return;
    await deleteDoc(doc(db, "planners", code, "photos", id));
  }

  return { load, save, subscribe, subscribePhotos, addPhoto, deletePhoto };
}
