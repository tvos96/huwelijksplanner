import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import AuthGate from "./components/AuthGate.jsx";
import WeddingSetup from "./components/WeddingSetup.jsx";
import InviteWidget from "./components/InviteWidget.jsx";
import { MONO } from "./data.js";
import { onAuthChange, finishSignInRedirect, getUserWeddingId, authErrorMessage } from "./lib/weddingAuth.js";
import "./index.css";

function Loading() {
  return (
    <div className="min-h-screen grid place-items-center bg-canvas">
      <div className="text-center"><img src={MONO} className="h-20 mx-auto opacity-90" alt="" /><p className="mt-3 text-sm text-muted">Even inloggen…</p></div>
    </div>
  );
}

function Root() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState("");
  // undefined = nog niet gecontroleerd, null = gecontroleerd en geen project, string = weddingId
  const [weddingId, setWeddingId] = useState(undefined);

  useEffect(() => {
    // Vangt de gebruiker op na een (eventuele) signInWithRedirect-terugkeer;
    // een mislukking wordt nu getoond in plaats van stil genegeerd.
    finishSignInRedirect().catch((e) => {
      console.error("Redirect-login mislukt:", e);
      setAuthError(authErrorMessage(e));
    });
    const unsub = onAuthChange((u) => {
      setUser(u);
      setReady(true);
      if (!u) setWeddingId(undefined);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    setWeddingId(undefined);
    getUserWeddingId(user.uid).then(setWeddingId);
  }, [user]);

  if (!ready) return <Loading />;
  if (!user) return <AuthGate initialError={authError} />;
  if (weddingId === undefined) return <Loading />;
  if (!weddingId) return <WeddingSetup user={user} onDone={setWeddingId} />;

  return (
    <>
      <InviteWidget weddingId={weddingId} user={user} />
      <App weddingId={weddingId} />
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
