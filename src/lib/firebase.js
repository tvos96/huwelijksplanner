import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Zelfde Firebase-project als de vorige versie van de app (tim-en-ita-wedding-planner).
// Dit is de publieke web-config van Firebase — niet geheim; de Firestore-rules
// bepalen wie welke data mag lezen/schrijven (alleen wie de gedeelde code kent).
const firebaseConfig = {
  apiKey: "AIzaSyDqOLX0R6rSZ8J7bI3InKtYXy8GWCmDnuA",
  authDomain: "tim-en-ita-wedding-planner.firebaseapp.com",
  projectId: "tim-en-ita-wedding-planner",
  storageBucket: "tim-en-ita-wedding-planner.firebasestorage.app",
  messagingSenderId: "177367400868",
  appId: "1:177367400868:web:df9a082b36835cac42c131",
  measurementId: "G-VCFB3ZT7FC",
};

let db = null;
let auth = null;
export const googleProvider = new GoogleAuthProvider();
// Altijd de accountkeuze tonen (handig als je met twee Google-accounts werkt).
googleProvider.setCustomParameters({ prompt: "select_account" });

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (e) {
  console.error("Firebase init mislukt:", e);
}

export { db, auth };
