import React, { useState } from "react";
import { MONO } from "../data";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { createWedding, joinWeddingWithInviteCode, signOutUser } from "../lib/weddingAuth";
import { defaultData } from "../App";

export default function WeddingSetup({ user, onDone }) {
  const [mode, setMode] = useState(null); // null | "new" | "join"
  const [inviteCode, setInviteCode] = useState("");
  const [partnerA, setPartnerA] = useState("");
  const [partnerB, setPartnerB] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function doCreate() {
    setBusy(true); setError("");
    try {
      const id = await createWedding(user, JSON.stringify(defaultData({ partnerA: partnerA.trim(), partnerB: partnerB.trim() })));
      onDone(id);
    } catch (e) { setError(e.message || "Aanmaken is niet gelukt."); setBusy(false); }
  }

  async function doJoin() {
    setBusy(true); setError("");
    try {
      const id = await joinWeddingWithInviteCode(user, inviteCode);
      onDone(id);
    } catch (e) { setError(e.message || "Aansluiten is niet gelukt."); setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 py-10">
      <div className="mx-auto max-w-[460px]">
        <div className="text-center">
          <img src={MONO} alt="" className="mx-auto mb-3 h-16 w-auto" />
          <h1 className="text-xl font-extrabold text-ink">Welkom, {user.displayName || user.email}</h1>
          <p className="mt-1 text-sm text-muted">Nog geen project gekoppeld aan dit account. Kies hieronder wat van toepassing is.</p>
        </div>

        {mode === null && (
          <div className="mt-6 space-y-3">
            <Card className="cursor-pointer hover:border-indigo" onClick={() => setMode("join")}>
              <CardContent className="pt-4">
                <div className="font-bold">Mijn partner heeft me uitgenodigd</div>
                <p className="mt-1 text-sm text-muted">Vul de uitnodigingscode in die je van je partner hebt gekregen.</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-indigo" onClick={() => setMode("new")}>
              <CardContent className="pt-4">
                <div className="font-bold">Nieuw, leeg project starten</div>
                <p className="mt-1 text-sm text-muted">Begin helemaal opnieuw.</p>
              </CardContent>
            </Card>
          </div>
        )}

        {mode === "join" && (
          <Card className="mt-6">
            <CardHeader><CardTitle>Uitnodigingscode invullen</CardTitle><CardDescription>Vraag je partner om de code die in de app te vinden is via "Partner uitnodigen".</CardDescription></CardHeader>
            <CardContent>
              <Input placeholder="uitnodigingscode" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} autoCapitalize="none" />
              {error && <p className="mt-2 text-sm text-rose-ink">{error}</p>}
              <div className="mt-3 flex gap-2">
                <Button disabled={busy || !inviteCode.trim()} onClick={doJoin}>{busy ? "Bezig…" : "Aansluiten"}</Button>
                <Button variant="ghost" onClick={() => { setMode(null); setError(""); }}>Terug</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {mode === "new" && (
          <Card className="mt-6">
            <CardHeader><CardTitle>Nieuw project starten</CardTitle><CardDescription>Vul jullie namen in. Je partner kan je hierna uitnodigen. Je kunt dit later altijd nog aanpassen.</CardDescription></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Jouw naam" value={partnerA} onChange={(e) => setPartnerA(e.target.value)} />
                <Input placeholder="Naam partner" value={partnerB} onChange={(e) => setPartnerB(e.target.value)} />
              </div>
              {error && <p className="mt-2 text-sm text-rose-ink">{error}</p>}
              <div className="mt-3 flex gap-2">
                <Button disabled={busy || !partnerA.trim() || !partnerB.trim()} onClick={doCreate}>{busy ? "Bezig…" : "Nieuw project starten"}</Button>
                <Button variant="ghost" onClick={() => { setMode(null); setError(""); }}>Terug</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 text-center">
          <button className="text-xs text-muted underline" onClick={() => signOutUser()}>Uitloggen ({user.email})</button>
        </div>
      </div>
    </div>
  );
}
