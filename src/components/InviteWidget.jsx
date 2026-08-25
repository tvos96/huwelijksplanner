import React, { useEffect, useState } from "react";
import { Users, Copy, Check, LogOut } from "lucide-react";
import { createInviteCode, listMembers, signOutUser } from "../lib/weddingAuth";

export default function InviteWidget({ weddingId, user }) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    listMembers(weddingId).then(setMembers).catch(() => {});
  }, [open, weddingId]);

  async function generateCode() {
    setBusy(true); setError(""); setCopied(false);
    try { setCode(await createInviteCode(weddingId, user)); }
    catch (e) { setError(e.message || "Code aanmaken is niet gelukt."); }
    setBusy(false);
  }

  function copyCode() {
    navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }

  return (
    <div className="fixed left-3 z-[800]" style={{ top: "calc(8px + env(safe-area-inset-top))" }}>
      {open && (
        <div className="absolute left-0 top-12 w-[260px] overflow-hidden rounded-xl2 border border-line bg-white p-4 shadow-soft">
          <div className="text-sm font-bold text-ink">Wie heeft toegang</div>
          <ul className="mt-2 space-y-1">
            {members.map((m) => (
              <li key={m.uid} className="truncate text-xs text-muted">
                {m.email || m.displayName || m.uid}{m.uid === user.uid ? " (jij)" : ""}
              </li>
            ))}
            {members.length === 0 && <li className="text-xs text-muted">Laden…</li>}
          </ul>

          <div className="mt-3 border-t border-line pt-3">
            <div className="text-sm font-bold text-ink">Partner uitnodigen</div>
            {!code ? (
              <button className="mt-2 w-full rounded-lg bg-indigo-soft px-3 py-2 text-xs font-semibold text-indigo-ink hover:bg-indigo-soft/70 disabled:opacity-50" disabled={busy} onClick={generateCode}>
                {busy ? "Bezig…" : "Genereer uitnodigingscode"}
              </button>
            ) : (
              <div className="mt-2">
                <div className="flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2">
                  <code className="flex-1 text-sm font-semibold tracking-wide text-ink">{code}</code>
                  <button onClick={copyCode} aria-label="Kopiëren" className="text-muted hover:text-indigo-ink">
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted">Stuur deze code naar je partner (bv. via WhatsApp). Die logt in met Google en vult 'm in bij "Ik heb een uitnodigingscode". Eenmalig te gebruiken.</p>
              </div>
            )}
            {error && <p className="mt-1.5 text-xs text-rose-ink">{error}</p>}
          </div>

          <button className="mt-3 flex w-full items-center gap-1.5 border-t border-line pt-3 text-xs font-semibold text-muted hover:text-rose-ink" onClick={() => signOutUser()}>
            <LogOut size={14} /> Uitloggen
          </button>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} title="Wie heeft toegang / partner uitnodigen"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-indigo shadow-soft opacity-85 hover:opacity-100">
        <Users size={18} />
      </button>
    </div>
  );
}
