import React, { useState } from "react";
import { MONO } from "../data";
import { Button } from "./ui/button";
import { authAvailable, signIn, authErrorMessage } from "../lib/weddingAuth";

export default function AuthGate({ initialError = "" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);

  async function handleSignIn() {
    setBusy(true);
    setError("");
    try {
      await signIn();
      // signInWithPopup: bij succes komt onAuthChange vanzelf met de nieuwe
      // gebruiker; hieronder alleen busy weer uitzetten.
      setBusy(false);
    } catch (e) {
      console.error("Inloggen mislukt:", e);
      setError(authErrorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-canvas px-6 text-center">
      <div className="w-full max-w-[380px]">
        <img src={MONO} alt="" className="mx-auto mb-4 h-24 w-auto" />
        <h1 className="text-xl font-extrabold text-ink">Welkom bij jullie planner</h1>
        <p className="mt-1 mb-6 text-[15px] leading-relaxed text-muted">
          Log in met Google. Alleen jij en wie jij uitnodigt kunnen jullie gegevens en foto's zien.
        </p>
        <Button variant="outline" className="w-full bg-white" disabled={busy || !authAvailable} onClick={handleSignIn}>
          <GoogleG /> {busy ? "Bezig…" : "Inloggen met Google"}
        </Button>
        {error && <p className="mt-3 text-sm text-rose-ink">{error}</p>}
        {!authAvailable && <p className="mt-4 text-xs text-rose-ink">Live-sync/inloggen kon niet starten — controleer je internetverbinding.</p>}
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 16.3 3 9.6 7.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 45c5.4 0 10.3-2.1 14-5.5l-6.5-5.5C29.4 35.8 26.8 37 24 37c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 40.6 16.2 45 24 45z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.5 5.5C41.5 35.8 45 30.4 45 24c0-1.4-.1-2.7-.4-3.5z" />
    </svg>
  );
}
