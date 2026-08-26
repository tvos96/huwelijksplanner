import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Heart, Users, MapPin, Wallet, CheckSquare, Star, X, Plus, ExternalLink, Check,
  Contact, Cloud, Trash2, ChevronLeft, ChevronRight, Phone, Mail, Play,
} from "lucide-react";
import { cn } from "./lib/utils";
import { Button } from "./components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Input, Textarea } from "./components/ui/input";
import { Progress } from "./components/ui/progress";
import { MONO, COUPLE_COLOR, COUPLE_EMPTY, VENUE_COORDS, VENUE_ADDR } from "./data";
import { createWeddingStore, syncAvailable } from "./lib/plannerStore";
import { exportExcel, importExcel } from "./lib/excel";

/* ---------- opslag: live gedeeld via Firebase, met localStorage als terugval ---------- */
const STORE_KEY = "wedding-planner-tim-ita-v2";

const uid = () => Math.random().toString(36).slice(2, 9);

export const defaultData = ({ partnerA = "", partnerB = "" } = {}) => ({
  settings: { partnerA, partnerB, date: "", location: "" },
  vendors: [],
  schedule: [
    { id: uid(), time: "13:30", label: "Aankomst gasten" },
    { id: uid(), time: "14:00", label: "Ceremonie" },
    { id: uid(), time: "15:00", label: "Toost & felicitaties" },
    { id: uid(), time: "16:00", label: "Fotoshoot bruidspaar" },
    { id: uid(), time: "18:00", label: "Diner" },
    { id: uid(), time: "21:00", label: "Openingsdans" },
    { id: uid(), time: "21:30", label: "Feest" },
  ],
  guests: [],
  venues: [],
  budget: {
    total: 35000, saved: 10000,
    items: [
      { id: uid(), label: "Locatie", est: 8000, paid: 0 },
      { id: uid(), label: "Catering & drank", est: 9000, paid: 0 },
      { id: uid(), label: "Kleding", est: 3000, paid: 0 },
      { id: uid(), label: "Fotografie & video", est: 3000, paid: 0 },
      { id: uid(), label: "Bloemen & decoratie", est: 2000, paid: 0 },
      { id: uid(), label: "Muziek / DJ", est: 1500, paid: 0 },
      { id: uid(), label: "Ringen", est: 2000, paid: 0 },
      { id: uid(), label: "Uitnodigingen & drukwerk", est: 600, paid: 0 },
    ],
  },
  tasks: [
    { id: uid(), label: "Datum prikken", done: false },
    { id: uid(), label: "Trouwlocatie kiezen & boeken", done: false },
    { id: uid(), label: "Trouwambtenaar / gemeente regelen", done: false },
    { id: uid(), label: "Gastenlijst afronden", done: true },
    { id: uid(), label: "Save-the-dates versturen", done: false },
    { id: uid(), label: "Uitnodigingen ontwerpen & versturen", done: false },
    { id: uid(), label: "Ringen uitzoeken", done: false },
    { id: uid(), label: "Trouwkleding kiezen", done: false },
    { id: uid(), label: "Fotograaf boeken", done: false },
    { id: uid(), label: "Catering & diner regelen", done: false },
    { id: uid(), label: "Muziek / DJ of band", done: false },
    { id: uid(), label: "Bruidstaart bestellen", done: false },
    { id: uid(), label: "Bloemen & decoratie", done: false },
    { id: uid(), label: "Ceremoniemeester vragen", done: false },
    { id: uid(), label: "Openingsdans oefenen", done: false },
  ],
});

/* ---------- helpers ---------- */
const euro = (n) => "€ " + (Number(n) || 0).toLocaleString("nl-NL", { maximumFractionDigits: 0 });
function daysUntil(s) { if (!s) return null; const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((new Date(s + "T00:00:00") - t) / 86400000); }
const NL_M = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
function longDate(s) { if (!s) return ""; const d = new Date(s + "T00:00:00"); return d.getDate() + " " + NL_M[d.getMonth()] + " " + d.getFullYear(); }
const isLink = (s) => /^(https?:\/\/|www\.)/i.test(s || "");
function parseLatLng(s) {
  if (!s) return null;
  const m = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
            s.match(/[?&](?:query|q|ll|daddr|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/) ||
            s.match(/(-?\d{1,2}\.\d{3,})[,\s]+(-?\d{1,3}\.\d{3,})/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
}
function parseMapsName(s) { const m = (s || "").match(/\/maps\/place\/([^/@]+)/); if (!m) return ""; try { return decodeURIComponent(m[1].replace(/\+/g, " ")).trim(); } catch { return m[1].replace(/\+/g, " ").trim(); } }
function isShortMapsLink(s) { return /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(s || ""); }
function isMapsUrl(s) { return /maps\.google|google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(s || ""); }
function coordsOf(v) { const p = parseLatLng(v.coords); if (p) return p; if (typeof v.lat === "number" && typeof v.lng === "number") return [v.lat, v.lng]; return VENUE_COORDS[v.name] || null; }
function addrOf(v) { return v.address || VENUE_ADDR[v.name] || ""; }

/* ---------- bruidspaar dat inkleurt ---------- */
function CoupleFill({ pct }) {
  const p = Math.max(0, Math.min(1, pct));
  const clip = "inset(" + ((1 - p) * 100).toFixed(1) + "% 0% 0% 0%)";
  const st = { left: "11%", top: "7%", width: "78%", height: "86%", objectFit: "contain" };
  return (
    <div className="relative mx-auto" style={{ width: 210, height: 210 }}>
      <img src={COUPLE_EMPTY} alt="" className="absolute" style={st} />
      <img src={COUPLE_COLOR} alt="Bruidspaar" className="absolute" style={{ ...st, clipPath: clip, WebkitClipPath: clip, transition: "clip-path .7s ease" }} />
    </div>
  );
}

/* ---------- kaart ---------- */
function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) return resolve(window.L);
    const ex = document.getElementById("leaflet-js");
    if (ex) { ex.addEventListener("load", () => resolve(window.L)); return; }
    const css = document.createElement("link"); css.rel = "stylesheet"; css.id = "leaflet-css";
    css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(css);
    const js = document.createElement("script"); js.id = "leaflet-js";
    js.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    js.onload = () => resolve(window.L); document.body.appendChild(js);
  });
}
function VenueMap({ venues }) {
  const ref = useRef(null); const mapRef = useRef(null);
  const sig = JSON.stringify(venues.map((v) => [v.name, v.coords || "", v.lat, v.lng, v.status, v.fav, v.place, v.country]));
  useEffect(() => {
    let cancelled = false;
    const pts = venues.map((v) => { const c = coordsOf(v); return c ? { v, c } : null; }).filter(Boolean);
    loadLeaflet().then((L) => {
      if (cancelled || !ref.current) return;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      const map = L.map(ref.current, { scrollWheelZoom: false }); mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 18 }).addTo(map);
      const colors = { fav: "#F5A524", open: "#17B0A7", rejected: "#F2547B" };
      const bounds = [];
      pts.forEach(({ v, c }) => {
        const col = v.fav ? colors.fav : (v.status === "rejected" ? colors.rejected : colors.open);
        const q = encodeURIComponent([v.name, v.place, v.country].filter(Boolean).join(" "));
        L.circleMarker(c, { radius: 9, color: "#fff", weight: 2, fillColor: col, fillOpacity: 1 }).addTo(map)
          .bindPopup('<b>' + v.name + '</b><br>' + [v.place, v.country].filter(Boolean).join(" · ") +
            '<br><a href="https://www.google.com/maps/search/?api=1&query=' + q + '" target="_blank" rel="noreferrer">Op Google Maps ↗</a>');
        bounds.push(c);
      });
      if (bounds.length) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 }); else map.setView([52, 5], 7);
      setTimeout(() => map.invalidateSize(), 250);
    });
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [sig]);
  return <div ref={ref} className="h-72 w-full rounded-xl border border-line overflow-hidden" />;
}

/* ---------- kleine bouwstenen ---------- */
function Pill({ active, tone = "indigo", children, onClick }) {
  const tones = {
    indigo: "bg-indigo text-white border-indigo",
    teal: "bg-teal text-white border-teal",
    amber: "bg-amber text-white border-amber",
    rose: "bg-rose text-white border-rose",
    ink: "bg-ink text-white border-ink",
  };
  return (
    <button onClick={onClick}
      className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        active ? tones[tone] : "border-line text-muted hover:text-ink")}>
      {children}
    </button>
  );
}
const TILE = {
  teal: "bg-teal-soft text-teal-ink", rose: "bg-rose-soft text-rose-ink",
  amber: "bg-amber-soft text-amber-ink", lilac: "bg-lilac-soft text-lilac-ink",
};
function Tile({ tone, label, value, sub, onClick }) {
  return (
    <button onClick={onClick} className={cn("rounded-xl2 p-4 text-left shadow-soft transition hover:-translate-y-0.5", TILE[tone])}>
      <div className="text-[11px] font-semibold opacity-80">{label}</div>
      <div className="mt-0.5 text-2xl font-extrabold leading-none">{value}</div>
      <div className="mt-1 text-xs opacity-75">{sub}</div>
    </button>
  );
}
function IconBtn({ onClick, label, children, className }) {
  return <button onClick={onClick} aria-label={label} className={cn("rounded-lg p-1.5 text-muted hover:text-rose hover:bg-rose-soft transition-colors", className)}>{children}</button>;
}
const FieldLabel = ({ children }) => <label className="mt-3 mb-1 block text-xs font-semibold text-indigo-ink">{children}</label>;

/* ============================================================ */
export default function WeddingPlanner({ weddingId }) {
  const store = useMemo(() => (syncAvailable && weddingId ? createWeddingStore(weddingId) : null), [weddingId]);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("overzicht");
  const [editSettings, setEditSettings] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const ready = useRef(false);
  const applyingRemote = useRef(false);

  useEffect(() => {
    let unsub = () => {};
    let cancelled = false;
    ready.current = false;
    (async () => {
      let initial = null;
      let cached = null;
      try { cached = localStorage.getItem(STORE_KEY); } catch { cached = null; }
      if (store) {
        try {
          initial = await store.load();
          if (initial) { try { localStorage.setItem(STORE_KEY, initial); } catch {} }
        } catch (e) {
          // Geen (tijdelijke) verbinding met de gedeelde lijst -> val terug op de
          // laatst bekende lokale kopie i.p.v. de app te laten hangen op "laden…".
          console.error("Kon gedeelde planner niet laden, val terug op lokale kopie:", e);
          initial = cached;
        }
      } else {
        initial = cached;
      }
      if (cancelled) return;
      setData(initial ? JSON.parse(initial) : defaultData());
      ready.current = true;
      if (store) {
        try {
          unsub = store.subscribe((json) => {
            applyingRemote.current = true;
            setData(json ? JSON.parse(json) : defaultData());
          });
        } catch (e) { console.error("Live-sync kon niet starten:", e); }
      }
    })();
    return () => { cancelled = true; unsub(); };
  }, [store]);

  useEffect(() => {
    if (!ready.current || !data) return;
    if (applyingRemote.current) { applyingRemote.current = false; return; }
    const json = JSON.stringify(data);
    try { localStorage.setItem(STORE_KEY, json); } catch (e) { console.error("Lokaal opslaan mislukt:", e); }
    if (store) store.save(json).catch((e) => console.error("Opslaan in gedeelde lijst mislukt:", e));
  }, [data]);

  if (!data) return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center"><img src={MONO} className="h-20 mx-auto opacity-90" alt="logo" /><p className="mt-3 text-sm text-muted">Even jullie plannen ophalen…</p></div>
    </div>
  );

  const set = (patch) => setData((d) => ({ ...d, ...patch }));
  const days = daysUntil(data.settings.date);
  const tabs = [["overzicht", "Overzicht", Heart], ["gasten", "Gasten", Users], ["locaties", "Locaties", MapPin], ["budget", "Budget", Wallet], ["taken", "Taken", CheckSquare], ["contacten", "Contacten", Contact]];

  return (
    <div className="min-h-screen bg-canvas pb-28">
      <BackupWidget data={data} setData={setData} />
      <div className="mx-auto max-w-[780px] px-4 pt-7">
        <header className="text-center pb-5">
          <img src={MONO} className="h-16 mx-auto" alt="Logo Huwelijksplanner" />
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-rose">Wij gaan trouwen</div>
          <h1 className="mt-1 text-4xl sm:text-5xl font-extrabold tracking-tight">
            {data.settings.partnerA} <span className="text-rose italic">&amp;</span> {data.settings.partnerB}
          </h1>
          {tab === "overzicht" && <PhotoFeature data={data} setData={setData} store={store} />}
          <div className="mt-1 text-muted">{longDate(data.settings.date) || "Datum nog te prikken"}{data.settings.location ? " · " + data.settings.location : ""}</div>
          {days !== null && (
            <div className="mt-4 inline-flex items-baseline gap-2 rounded-full bg-rose-soft px-6 py-3">
              <b className="text-4xl font-extrabold leading-none text-rose-ink">{days >= 0 ? days : 0}</b>
              <span className="text-xs font-medium text-muted">{days > 1 ? "dagen te gaan" : days === 1 ? "dag te gaan" : days === 0 ? "het is vandaag!" : "getrouwd"}</span>
            </div>
          )}
        </header>

        {tab === "overzicht" && <Overview data={data} setData={setData} set={set} editSettings={editSettings} setEditSettings={setEditSettings} go={setTab} />}
        {tab === "gasten" && <Guests data={data} setData={setData} />}
        {tab === "locaties" && <Venues data={data} setData={setData} />}
        {tab === "budget" && <Budget data={data} setData={setData} />}
        {tab === "taken" && <Tasks data={data} setData={setData} />}
        {tab === "contacten" && <Vendors data={data} setData={setData} />}

        <div className="mt-8 text-center text-xs text-muted">
          Gemaakt met liefde · <button className="underline" onClick={() => setResetOpen(true)}>opnieuw beginnen</button>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/90 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto flex max-w-[560px] justify-around px-1 py-2">
          {tabs.map(([k, l, Icon]) => (
            <button key={k} onClick={() => setTab(k)}
              className={cn("flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] font-semibold transition-colors",
                tab === k ? "text-indigo" : "text-muted hover:text-ink")}>
              <Icon size={22} strokeWidth={tab === k ? 2.4 : 1.9} />
              <span>{l}</span>
            </button>
          ))}
        </div>
      </nav>

      {resetOpen && (
        <ResetGuard
          onCancel={() => setResetOpen(false)}
          onConfirm={() => {
            setData(defaultData({ partnerA: data.settings.partnerA, partnerB: data.settings.partnerB }));
            setResetOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* ---------------- Guardrail voor "opnieuw beginnen" ---------------- */
function ResetGuard({ onCancel, onConfirm }) {
  const [text, setText] = useState("");
  const ok = text.trim().toLowerCase() === "verwijder";
  return createPortal((
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="w-full max-w-[380px] rounded-2xl bg-white p-5 shadow-lift">
        <h2 className="text-lg font-bold text-rose-ink">Alles wissen en opnieuw beginnen?</h2>
        <p className="mt-2 text-sm text-muted">
          Dit verwijdert permanent jullie gasten, locaties, budget, taken, contacten en foto's/video's — ook bij je
          partner. Dit kan niet ongedaan gemaakt worden.
        </p>
        <p className="mt-3 text-sm font-semibold text-ink">Typ <span className="text-rose-ink">verwijder</span> om te bevestigen:</p>
        <Input className="mt-1.5" value={text} onChange={(e) => setText(e.target.value)} placeholder="verwijder" autoFocus />
        <div className="mt-4 flex gap-2">
          <Button variant="rose" disabled={!ok} onClick={onConfirm}>Ja, alles wissen</Button>
          <Button variant="ghost" onClick={onCancel}>Annuleren</Button>
        </div>
      </div>
    </div>
  ), document.body);
}

/* ---------------- Overzicht ---------------- */
function Overview({ data, setData, set, editSettings, setEditSettings, go }) {
  const s = data.settings;
  const [draft, setDraft] = useState(s);
  const [quickDate, setQuickDate] = useState("");
  useEffect(() => setDraft(s), [editSettings]);

  const coming = data.guests.reduce((a, x) => a + (x.rsvp === "yes" ? (Number(x.count) || 0) : 0), 0);
  const invited = data.guests.reduce((a, x) => a + (Number(x.count) || 0), 0);
  const vOpen = data.venues.filter((v) => v.status !== "rejected").length;
  const vFav = data.venues.filter((v) => v.fav).length;
  const savedPct = data.budget.total ? Math.round(data.budget.saved / data.budget.total * 100) : 0;
  const done = data.tasks.filter((t) => t.done).length;

  const updS = (id, f, v) => setData((d) => ({ ...d, schedule: d.schedule.map((i) => i.id === id ? { ...i, [f]: v } : i) }));
  const addS = () => setData((d) => ({ ...d, schedule: [...d.schedule, { id: uid(), time: "", label: "Nieuw moment" }] }));
  const delS = (id) => setData((d) => ({ ...d, schedule: d.schedule.filter((i) => i.id !== id) }));
  const sorted = [...data.schedule].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="space-y-4">
      {!s.date && (
        <Card className="border-rose/30 bg-rose-soft/50">
          <CardContent className="pt-5 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-rose">Eerst het belangrijkste</div>
            <h2 className="mt-1 text-xl font-bold">Prik jullie datum</h2>
            <p className="mt-1 text-sm text-muted">Zodra de datum staat verschijnt de aftelteller en kun je de dag plannen.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Input type="date" className="max-w-[180px] bg-white" value={quickDate} onChange={(e) => setQuickDate(e.target.value)} />
              <Button disabled={!quickDate} onClick={() => set({ settings: { ...s, date: quickDate } })}>Datum vastleggen</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Tile tone="teal" label="Gasten" value={<>{coming} <span className="text-base font-semibold opacity-60">/ {invited}</span></>} sub="komen / uitgenodigd" onClick={() => go("gasten")} />
        <Tile tone="rose" label="Locaties" value={<>{vOpen} <span className="text-base font-semibold opacity-60">· {vFav}★</span></>} sub="in beeld · favoriet" onClick={() => go("locaties")} />
        <Tile tone="amber" label="Budget bijeen" value={savedPct + "%"} sub={euro(data.budget.saved) + " van " + euro(data.budget.total)} onClick={() => go("budget")} />
        <Tile tone="lilac" label="Taken" value={<>{done} <span className="text-base font-semibold opacity-60">/ {data.tasks.length}</span></>} sub="afgerond" onClick={() => go("taken")} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div><CardTitle>Onze gegevens</CardTitle><CardDescription>De basis van jullie grote dag.</CardDescription></div>
          {!editSettings && <Button variant="outline" size="sm" onClick={() => setEditSettings(true)}>Bewerken</Button>}
        </CardHeader>
        <CardContent>
          {editSettings ? (
            <div className="grid gap-2">
              <div><FieldLabel>Naam 1</FieldLabel><Input value={draft.partnerA} onChange={(e) => setDraft({ ...draft, partnerA: e.target.value })} /></div>
              <div><FieldLabel>Naam 2</FieldLabel><Input value={draft.partnerB} onChange={(e) => setDraft({ ...draft, partnerB: e.target.value })} /></div>
              <div><FieldLabel>Trouwdatum</FieldLabel><Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></div>
              <div><FieldLabel>Locatie (optioneel)</FieldLabel><Input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} /></div>
              <div className="mt-2 flex gap-2">
                <Button onClick={() => { set({ settings: draft }); setEditSettings(false); }}>Bewaren</Button>
                <Button variant="ghost" onClick={() => setEditSettings(false)}>Annuleren</Button>
              </div>
            </div>
          ) : (
            <p className="text-[15px] text-ink/80">{s.partnerA} & {s.partnerB}{s.date ? " · " + longDate(s.date) : " · datum nog te prikken"}{s.location ? " · " + s.location : ""}</p>
          )}
        </CardContent>
      </Card>

      {s.date && (
        <Card>
          <CardHeader><CardTitle>Dagplanning</CardTitle><CardDescription>Het verloop van de trouwdag.</CardDescription></CardHeader>
          <CardContent className="space-y-1">
            {sorted.map((i) => (
              <div key={i.id} className="flex items-center gap-3 border-t border-line py-2 first:border-0">
                <Input className="w-20 font-semibold text-teal-ink" value={i.time} placeholder="00:00" onChange={(e) => updS(i.id, "time", e.target.value)} />
                <Input className="flex-1" value={i.label} onChange={(e) => updS(i.id, "label", e.target.value)} />
                <IconBtn label="Verwijderen" onClick={() => delS(i.id)}><X size={18} /></IconBtn>
              </div>
            ))}
            <div className="pt-2"><Button variant="outline" size="sm" onClick={addS}><Plus size={16} /> Moment toevoegen</Button></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ---------------- Gasten ---------------- */
function Guests({ data, setData }) {
  const [flt, setFlt] = useState("alle");
  const g = data.guests;
  const shown = g.filter((x) => flt === "alle" || x.side === flt);
  const coming = g.reduce((a, x) => a + (x.rsvp === "yes" ? (Number(x.count) || 0) : 0), 0);
  const invited = g.reduce((a, x) => a + (Number(x.count) || 0), 0);
  const pending = g.filter((x) => x.rsvp === "pending").length;
  const upd = (id, f, v) => setData((d) => ({ ...d, guests: d.guests.map((x) => x.id === id ? { ...x, [f]: v } : x) }));
  const add = () => setData((d) => ({ ...d, guests: [{ id: uid(), name: "Nieuwe gast", count: 1, rsvp: "pending", diet: "", rel: "", side: "Tim", note: "" }, ...d.guests] }));
  const del = (id) => setData((d) => ({ ...d, guests: d.guests.filter((x) => x.id !== id) }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Gasten</CardTitle><CardDescription>Wie komt er, en wie moet nog reageren?</CardDescription></CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <div><div className="text-2xl font-extrabold text-teal-ink">{coming}</div><div className="text-xs text-muted">komen</div></div>
            <div><div className="text-2xl font-extrabold text-indigo-ink">{invited}</div><div className="text-xs text-muted">uitgenodigd</div></div>
            <div><div className="text-2xl font-extrabold text-amber-ink">{pending}</div><div className="text-xs text-muted">geen reactie</div></div>
          </div>
          <div className="mt-4 flex gap-2">
            {[["alle", "Iedereen"], ["Tim", "Tim"], ["Ita", "Ita"]].map(([k, l]) => <Pill key={k} tone="ink" active={flt === k} onClick={() => setFlt(k)}>{l}</Pill>)}
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" size="sm" onClick={add}><Plus size={16} /> Gast toevoegen</Button>

      {shown.map((x) => (
        <Card key={x.id}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Input className="flex-1 font-semibold" value={x.name} onChange={(e) => upd(x.id, "name", e.target.value)} />
              <Input type="number" min="0" className="w-16" value={x.count} onChange={(e) => upd(x.id, "count", e.target.value)} />
              <IconBtn label="Verwijderen" onClick={() => del(x.id)}><X size={18} /></IconBtn>
            </div>
            {x.rel && <div className="mt-1 text-xs text-muted">{x.rel}</div>}
            <div className="mt-2 flex gap-2">
              <Pill tone="teal" active={x.rsvp === "yes"} onClick={() => upd(x.id, "rsvp", "yes")}>Komt</Pill>
              <Pill tone="rose" active={x.rsvp === "no"} onClick={() => upd(x.id, "rsvp", "no")}>Komt niet</Pill>
              <Pill tone="amber" active={x.rsvp === "pending"} onClick={() => upd(x.id, "rsvp", "pending")}>Onbekend</Pill>
            </div>
            <Input className="mt-2" placeholder="Dieetwensen / notitie" value={x.diet} onChange={(e) => upd(x.id, "diet", e.target.value)} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ---------------- Locaties ---------------- */
function Venues({ data, setData }) {
  const [flt, setFlt] = useState("alle");
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const v = data.venues;
  const rank = (x) => (x.status === "rejected" ? 1 : 0);
  const list = [...v].sort((a, b) => rank(a) - rank(b));
  const shown = list.filter((x) => flt === "alle" || (flt === "intr" && x.status !== "rejected") || (flt === "rej" && x.status === "rejected") || (flt === "fav" && x.fav));
  const upd = (id, f, val) => setData((d) => ({ ...d, venues: d.venues.map((x) => x.id === id ? { ...x, [f]: val } : x) }));
  const addVenue = (obj) => setData((d) => ({ ...d, venues: [{ id: uid(), name: "Nieuwe locatie", country: "", place: "", province: "", address: "", web: "", ita: "", tim: "", status: "open", fav: false, coords: "", ...obj }, ...d.venues] }));
  const add = () => addVenue({});
  const del = (id) => setData((d) => ({ ...d, venues: d.venues.filter((x) => x.id !== id) }));

  const addFromLink = async () => {
    const url = link.trim(); if (!url) return; setLoading(true);
    try {
      const res = await fetch("/.netlify/functions/place?link=" + encodeURIComponent(url));
      if (res.ok) {
        const d = await res.json();
        if (!d.error) {
          addVenue({ name: d.name || parseMapsName(url) || "Nieuwe locatie", place: d.place || "", province: d.province || "", country: d.country || "", address: d.address || "", web: d.website || "", coords: (d.lat != null && d.lng != null) ? (d.lat + ", " + d.lng) : url });
          setLink(""); setLoading(false); return;
        }
      }
    } catch (e) { /* val terug op lokaal uitlezen */ }
    if (isShortMapsLink(url)) { setLoading(false); alert("Dit is een verkorte deellink. De automatische ophaalfunctie is nog niet actief. Kopieer de link uit de adresbalk van Google Maps, of plak coördinaten (52.09, 4.88)."); return; }
    const c = parseLatLng(url); const nm = parseMapsName(url);
    if (!c && !nm) { setLoading(false); alert("Kon geen locatie uit deze link halen. Plak de volledige Google Maps-link, of coördinaten (52.09, 4.88)."); return; }
    addVenue({ name: nm || "Nieuwe locatie", coords: url }); setLink(""); setLoading(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Locaties</CardTitle>
          <CardDescription>{v.filter((x) => x.status !== "rejected").length} in beeld · {v.filter((x) => x.status === "rejected").length} afgekruist · {v.filter((x) => x.fav).length} favoriet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[["alle", "Alle (" + v.length + ")"], ["intr", "Interessant"], ["rej", "Afgekruist"], ["fav", "Favoriet"]].map(([k, l]) => <Pill key={k} tone="ink" active={flt === k} onClick={() => setFlt(k)}>{l}</Pill>)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Op de kaart</CardTitle></CardHeader>
        <CardContent>
          <VenueMap venues={v} />
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-teal" />Interessant</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber" />Favoriet</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose" />Afgekruist</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Locatie toevoegen</CardTitle><CardDescription>Plak een Google Maps-link — naam, adres, plaats, provincie en website worden automatisch opgehaald.</CardDescription></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Input className="min-w-[180px] flex-1" placeholder="Plak Google Maps-link of coördinaten" value={link} disabled={loading} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addFromLink(); }} />
            <Button onClick={addFromLink} disabled={loading}>{loading ? "Ophalen…" : "Toevoegen via link"}</Button>
          </div>
          <div className="mt-2"><Button variant="ghost" size="sm" onClick={add}><Plus size={16} /> Handmatig toevoegen</Button></div>
        </CardContent>
      </Card>

      {shown.map((x) => (
        <Card key={x.id} className={cn(x.status === "rejected" && "opacity-60")}>
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <input className={cn("w-full bg-transparent text-lg font-bold focus:outline-none", x.status === "rejected" && "line-through")} value={x.name} onChange={(e) => upd(x.id, "name", e.target.value)} />
                <div className="mt-0.5 text-xs text-muted">{addrOf(x) || [x.place, x.country].filter(Boolean).join(" · ") || "Adres nog onbekend"}</div>
              </div>
              <IconBtn label="Favoriet" onClick={() => upd(x.id, "fav", !x.fav)} className={cn(x.fav && "text-amber hover:text-amber")}><Star size={20} fill={x.fav ? "#F5A524" : "none"} /></IconBtn>
              <IconBtn label="Verwijderen" onClick={() => del(x.id)}><X size={18} /></IconBtn>
            </div>
            <div className="mt-2 flex gap-2">
              <Pill tone="teal" active={x.status !== "rejected"} onClick={() => upd(x.id, "status", "open")}>Interessant</Pill>
              <Pill tone="rose" active={x.status === "rejected"} onClick={() => upd(x.id, "status", "rejected")}>Afgekruist</Pill>
            </div>
            <FieldLabel>Opmerking Ita</FieldLabel>
            <Textarea placeholder="Wat vindt Ita ervan?" value={x.ita} onChange={(e) => upd(x.id, "ita", e.target.value)} />
            <FieldLabel>Opmerking Tim</FieldLabel>
            <Textarea placeholder="Wat vindt Tim ervan?" value={x.tim} onChange={(e) => upd(x.id, "tim", e.target.value)} />
            <FieldLabel>Adres</FieldLabel>
            <Input placeholder="Straat, postcode, plaats" value={x.address || VENUE_ADDR[x.name] || ""} onChange={(e) => upd(x.id, "address", e.target.value)} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div><FieldLabel>Plaats</FieldLabel><Input placeholder="Plaats" value={x.place || ""} onChange={(e) => upd(x.id, "place", e.target.value)} /></div>
              <div><FieldLabel>Website</FieldLabel><Input placeholder="https://..." value={x.web || ""} onChange={(e) => upd(x.id, "web", e.target.value)} /></div>
            </div>
            <FieldLabel>Locatie op de kaart</FieldLabel>
            <Input placeholder="Google Maps-link of coördinaten (52.09, 4.88)" value={x.coords || ""} onChange={(e) => upd(x.id, "coords", e.target.value)} />
            <div className={cn("mt-1 text-xs", coordsOf(x) ? "text-teal-ink" : "text-muted")}>{coordsOf(x) ? "✓ staat op de kaart" : "Nog niet op de kaart"}</div>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <a className="inline-flex items-center gap-1 text-sm text-indigo-ink underline" target="_blank" rel="noreferrer" href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([x.name, x.place, x.country].filter(Boolean).join(" "))}><MapPin size={14} /> Op Google Maps</a>
              {x.web && isLink(x.web) && <a className="inline-flex items-center gap-1 text-sm text-indigo-ink underline" target="_blank" rel="noreferrer" href={x.web.startsWith("http") ? x.web : "https://" + x.web}><ExternalLink size={14} /> Website</a>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ---------------- Budget ---------------- */
function Budget({ data, setData }) {
  const b = data.budget;
  const estTotal = b.items.reduce((a, x) => a + (Number(x.est) || 0), 0);
  const paidTotal = b.items.reduce((a, x) => a + (Number(x.paid) || 0), 0);
  const remaining = (Number(b.total) || 0) - estTotal;
  const estPct = b.total ? Math.min(100, Math.round(estTotal / b.total * 100)) : 0;
  const savedFrac = b.total ? (Number(b.saved) || 0) / b.total : 0;
  const savedPct = Math.round(savedFrac * 100);
  const cap = savedPct >= 100 ? "Helemaal rond — het budget staat klaar!" : savedPct >= 75 ? "Bijna rond, het paar is bijna ingekleurd!" : savedPct >= 45 ? "Goed bezig — al flink wat bij elkaar." : savedPct >= 15 ? "Lekker op weg met sparen." : "Net begonnen met sparen.";
  const setB = (f, val) => setData((d) => ({ ...d, budget: { ...d.budget, [f]: Number(val) } }));
  const upd = (id, f, val) => setData((d) => ({ ...d, budget: { ...d.budget, items: d.budget.items.map((x) => x.id === id ? { ...x, [f]: val } : x) } }));
  const add = () => setData((d) => ({ ...d, budget: { ...d.budget, items: [...d.budget.items, { id: uid(), label: "Nieuwe post", est: 0, paid: 0 }] } }));
  const del = (id) => setData((d) => ({ ...d, budget: { ...d.budget, items: d.budget.items.filter((x) => x.id !== id) } }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Budget bijeen</CardTitle><CardDescription>Het bruidspaar kleurt van onderaf in naarmate jullie het doelbudget bij elkaar hebben.</CardDescription></CardHeader>
        <CardContent className="text-center">
          <CoupleFill pct={savedFrac} />
          <div className="mt-3 text-3xl font-extrabold">{euro(b.saved)} <span className="text-lg font-normal text-muted">van {euro(b.total)}</span></div>
          <p className="mt-1 text-[15px] text-muted">{cap} ({savedPct}%)</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3 text-left">
            <div><FieldLabel>Op de rekening</FieldLabel><Input type="number" className="max-w-[150px]" value={b.saved} onChange={(e) => setB("saved", e.target.value)} /></div>
            <div><FieldLabel>Totaalbudget (doel)</FieldLabel><Input type="number" className="max-w-[150px]" value={b.total} onChange={(e) => setB("total", e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Begroting</CardTitle><CardDescription>Wat jullie per onderdeel verwachten te besteden.</CardDescription></CardHeader>
        <CardContent>
          <Progress value={estPct} barClassName={estPct > 100 ? "bg-rose" : "bg-amber"} />
          <div className="mt-4 flex gap-6">
            <div><div className="text-2xl font-extrabold text-amber-ink">{euro(estTotal)}</div><div className="text-xs text-muted">begroot</div></div>
            <div><div className="text-2xl font-extrabold text-teal-ink">{euro(paidTotal)}</div><div className="text-xs text-muted">betaald</div></div>
            <div><div className={cn("text-2xl font-extrabold", remaining < 0 ? "text-rose-ink" : "text-indigo-ink")}>{euro(remaining)}</div><div className="text-xs text-muted">ruimte over</div></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 space-y-1">
          {b.items.map((x) => (
            <div key={x.id} className="flex flex-wrap items-center gap-2 border-t border-line py-2 first:border-0">
              <Input className="min-w-[120px] flex-1" value={x.label} onChange={(e) => upd(x.id, "label", e.target.value)} />
              <div className="w-24"><FieldLabel>begroot</FieldLabel><Input type="number" value={x.est} onChange={(e) => upd(x.id, "est", e.target.value)} /></div>
              <div className="w-24"><FieldLabel>betaald</FieldLabel><Input type="number" value={x.paid} onChange={(e) => upd(x.id, "paid", e.target.value)} /></div>
              <IconBtn label="Verwijderen" onClick={() => del(x.id)}><X size={18} /></IconBtn>
            </div>
          ))}
          <div className="pt-2"><Button variant="outline" size="sm" onClick={add}><Plus size={16} /> Post toevoegen</Button></div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- Taken ---------------- */
function Tasks({ data, setData }) {
  const t = data.tasks;
  const done = t.filter((x) => x.done).length;
  const pct = t.length ? Math.round(done / t.length * 100) : 0;
  const toggle = (id) => setData((d) => ({ ...d, tasks: d.tasks.map((x) => x.id === id ? { ...x, done: !x.done } : x) }));
  const upd = (id, v) => setData((d) => ({ ...d, tasks: d.tasks.map((x) => x.id === id ? { ...x, label: v } : x) }));
  const add = () => setData((d) => ({ ...d, tasks: [...d.tasks, { id: uid(), label: "Nieuwe taak", done: false }] }));
  const del = (id) => setData((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== id) }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Taken</CardTitle><CardDescription>{done} van {t.length} afgerond — goed bezig.</CardDescription></CardHeader>
        <CardContent><Progress value={pct} barClassName="bg-teal" /></CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 space-y-1">
          {t.map((x) => (
            <div key={x.id} className="flex items-center gap-3 border-t border-line py-2 first:border-0">
              <button onClick={() => toggle(x.id)} aria-label="Afronden"
                className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors",
                  x.done ? "border-teal bg-teal text-white" : "border-teal text-transparent hover:bg-teal-soft")}>
                <Check size={14} strokeWidth={3} />
              </button>
              <input className={cn("flex-1 bg-transparent focus:outline-none", x.done && "text-muted line-through")} value={x.label} onChange={(e) => upd(x.id, e.target.value)} />
              <IconBtn label="Verwijderen" onClick={() => del(x.id)}><X size={18} /></IconBtn>
            </div>
          ))}
          <div className="pt-2"><Button variant="outline" size="sm" onClick={add}><Plus size={16} /> Taak toevoegen</Button></div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- Contacten (leveranciers) ---------------- */
function Vendors({ data, setData }) {
  const list = data.vendors || [];
  const ROLES = ["Fotograaf", "Cateraar", "Muziek / DJ", "Bloemist", "Trouwambtenaar", "Taart", "Vervoer", "Decoratie"];
  const [roleFlt, setRoleFlt] = useState("alle");
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);

  const upd = (id, f, val) => setData((d) => ({ ...d, vendors: (d.vendors || []).map((x) => x.id === id ? { ...x, [f]: val } : x) }));
  const addVendor = (obj) => setData((d) => ({ ...d, vendors: [{ id: uid(), name: "", role: "", phone: "", email: "", web: "", price: "", status: "", note: "", ...obj }, ...(d.vendors || [])] }));
  const add = (role) => addVendor({ role: role || "" });
  const del = (id) => setData((d) => ({ ...d, vendors: (d.vendors || []).filter((x) => x.id !== id) }));
  const booked = list.filter((x) => x.status === "geboekt").length;

  // Filterbalk toont alleen rollen die daadwerkelijk voorkomen, zodat je in
  // één oogopslag bijv. al je fotografen kunt zien.
  const filterRoles = Array.from(new Set(list.map((x) => x.role).filter(Boolean)))
    .sort((a, b) => (ROLES.indexOf(a) === -1 ? 99 : ROLES.indexOf(a)) - (ROLES.indexOf(b) === -1 ? 99 : ROLES.indexOf(b)));
  const shown = roleFlt === "alle" ? list : list.filter((x) => x.role === roleFlt);

  const addFromLink = async () => {
    const url = link.trim(); if (!url) return; setLoading(true);
    try {
      const param = isMapsUrl(url) ? "link=" + encodeURIComponent(url) : "website=" + encodeURIComponent(url);
      const res = await fetch("/.netlify/functions/vendor?" + param);
      const d = await res.json();
      if (res.ok && !d.error) {
        addVendor({ name: d.name || "Nieuw contact", role: d.role || "", phone: d.phone || "", email: d.email || "", web: d.website || (isMapsUrl(url) ? "" : url) });
        setLink(""); setLoading(false); return;
      }
      alert(d.error || "Kon geen informatie ophalen van deze link.");
    } catch (e) { alert("Kon geen informatie ophalen van deze link. Voeg 'm handmatig toe."); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Leveranciers &amp; contacten</CardTitle>
          <CardDescription>{list.length} {list.length === 1 ? "contact" : "contacten"} · {booked} geboekt</CardDescription>
        </CardHeader>
        {filterRoles.length > 0 && (
          <CardContent>
            <FieldLabel>Filter op rol</FieldLabel>
            <div className="mt-1 flex flex-wrap gap-2">
              <Pill tone="ink" active={roleFlt === "alle"} onClick={() => setRoleFlt("alle")}>Alle ({list.length})</Pill>
              {filterRoles.map((r) => (
                <Pill key={r} tone="ink" active={roleFlt === r} onClick={() => setRoleFlt(r)}>{r} ({list.filter((x) => x.role === r).length})</Pill>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader><CardTitle>Contact toevoegen via link</CardTitle>
          <CardDescription>Plak een Google Maps-link of de website van de leverancier — naam, rol, telefoon en e-mail worden waar mogelijk automatisch opgehaald.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Input className="min-w-[180px] flex-1" placeholder="Google Maps-link of website (https://...)" value={link} disabled={loading} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addFromLink(); }} />
            <Button onClick={addFromLink} disabled={loading || !link.trim()}>{loading ? "Ophalen…" : "Toevoegen via link"}</Button>
          </div>
          <FieldLabel>Of handmatig, met rol</FieldLabel>
          <div className="mt-1 flex flex-wrap gap-2">
            {ROLES.map((r) => <button key={r} onClick={() => add(r)} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:border-indigo hover:text-indigo-ink">+ {r}</button>)}
          </div>
          <div className="mt-2"><Button variant="ghost" size="sm" onClick={() => add("")}><Plus size={16} /> Handmatig toevoegen</Button></div>
        </CardContent>
      </Card>

      {shown.length === 0 && (
        <Card><CardContent className="pt-4"><p className="text-sm text-muted">{list.length === 0 ? "Nog geen contacten. Voeg er hierboven een toe, via een link of handmatig." : "Geen contacten met deze rol."}</p></CardContent></Card>
      )}

      {shown.map((x) => (
        <Card key={x.id}>
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <input className="w-full bg-transparent text-lg font-bold focus:outline-none" placeholder="Naam / bedrijf" value={x.name || ""} onChange={(e) => upd(x.id, "name", e.target.value)} />
                <input className="w-full bg-transparent text-xs text-muted focus:outline-none" placeholder="Rol (bv. Fotograaf)" value={x.role || ""} onChange={(e) => upd(x.id, "role", e.target.value)} />
              </div>
              <IconBtn label="Verwijderen" onClick={() => { if (confirm("Dit contact verwijderen?")) del(x.id); }}><X size={18} /></IconBtn>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Pill tone="amber" active={x.status === "optie"} onClick={() => upd(x.id, "status", x.status === "optie" ? "" : "optie")}>Optie</Pill>
              <Pill tone="teal" active={x.status === "geboekt"} onClick={() => upd(x.id, "status", x.status === "geboekt" ? "" : "geboekt")}>Geboekt</Pill>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div><FieldLabel>Telefoon</FieldLabel><Input type="tel" placeholder="06-..." value={x.phone || ""} onChange={(e) => upd(x.id, "phone", e.target.value)} /></div>
              <div><FieldLabel>Prijs</FieldLabel><Input placeholder="bv. € 2.500" value={x.price || ""} onChange={(e) => upd(x.id, "price", e.target.value)} /></div>
            </div>
            <FieldLabel>E-mail</FieldLabel>
            <Input type="email" placeholder="naam@bedrijf.nl" value={x.email || ""} onChange={(e) => upd(x.id, "email", e.target.value)} />
            <FieldLabel>Website</FieldLabel>
            <Input placeholder="https://..." value={x.web || ""} onChange={(e) => upd(x.id, "web", e.target.value)} />
            <FieldLabel>Notitie</FieldLabel>
            <Textarea placeholder="Afspraken, offertelink, etc." value={x.note || ""} onChange={(e) => upd(x.id, "note", e.target.value)} />
            <div className="mt-3 flex flex-wrap gap-4">
              {x.phone && <a className="inline-flex items-center gap-1 text-sm text-indigo-ink underline" href={"tel:" + (x.phone || "").replace(/\s/g, "")}><Phone size={14} /> Bellen</a>}
              {x.email && <a className="inline-flex items-center gap-1 text-sm text-indigo-ink underline" href={"mailto:" + x.email}><Mail size={14} /> Mailen</a>}
              {x.web && isLink(x.web) && <a className="inline-flex items-center gap-1 text-sm text-indigo-ink underline" target="_blank" rel="noreferrer" href={x.web.startsWith("http") ? x.web : "https://" + x.web}><ExternalLink size={14} /> Website</a>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ---------------- Foto's & video's: gallerij ---------------- */
const MAX_VIDEO_BYTES = 550 * 1024; // Firestore-documentlimiet (1 MiB) laat na base64 maar een paar honderd KB toe

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth, h = img.naturalHeight;
      const MAX = 1400, s = Math.min(1, MAX / Math.max(w, h));
      let cw = Math.max(1, Math.round(w * s)), ch = Math.max(1, Math.round(h * s));
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      function render() { canvas.width = cw; canvas.height = ch; ctx.drawImage(img, 0, 0, cw, ch); }
      render();
      let q = 0.8, dataUrl = canvas.toDataURL("image/jpeg", q);
      while (dataUrl.length > 680 * 1024 && q > 0.42) { q -= 0.1; dataUrl = canvas.toDataURL("image/jpeg", q); }
      while (dataUrl.length > 680 * 1024 && cw > 700) { cw = Math.round(cw * 0.85); ch = Math.round(ch * 0.85); render(); dataUrl = canvas.toDataURL("image/jpeg", 0.62); }
      resolve({ dataUrl, w: cw, h: ch, type: "image" });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Kon de afbeelding niet lezen")); };
    img.src = url;
  });
}

function readVideo(file) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_VIDEO_BYTES) {
      reject(new Error(
        `"${file.name}" is te groot (${Math.round(file.size / 1024)} KB). Video's kunnen hier tot ongeveer ` +
        `${Math.round(MAX_VIDEO_BYTES / 1024)} KB groot zijn — dat is een korte clip van een paar seconden in lage ` +
        `kwaliteit. Neem een kortere clip op of comprimeer 'm eerst.`
      ));
      return;
    }
    const r = new FileReader();
    r.onload = () => resolve({ dataUrl: String(r.result), w: 0, h: 0, type: "video" });
    r.onerror = () => reject(new Error(`Kon "${file.name}" niet lezen`));
    r.readAsDataURL(file);
  });
}

function useAddedPhotos(store) {
  const [added, setAdded] = useState([]);
  useEffect(() => {
    if (!store) { setAdded([]); return; }
    const unsub = store.subscribePhotos(setAdded);
    return () => unsub();
  }, [store]);
  return added;
}

function PhotoFeature({ data, setData, store }) {
  const photos = useAddedPhotos(store);
  const n = photos.length;

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [viewer, setViewer] = useState(-1);
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const touchX = useRef(null);

  const cur = n ? Math.min(idx, n - 1) : 0;

  useEffect(() => {
    if (n < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % n), 4000);
    return () => clearInterval(t);
  }, [n]);

  async function onPick(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    if (!store) { alert("Foto's en video's toevoegen werkt alleen zodra live-sync actief is."); return; }
    setBusy(true);
    const errors = [];
    for (const file of files) {
      try {
        const isVideo = file.type.startsWith("video/");
        const r = isVideo ? await readVideo(file) : await compressImage(file);
        await store.addPhoto(r.dataUrl, r.w, r.h, r.type);
      } catch (err) { console.error(err); errors.push(err.message || String(err)); }
    }
    setBusy(false);
    if (errors.length) alert(errors.join("\n\n"));
  }

  function removeAt(i) {
    const p = photos[i];
    if (!p || !store) return;
    store.deletePhoto(p.id);
    const remaining = n - 1;
    if (remaining <= 0) setViewer(-1);
    else setViewer((v) => Math.min(v, remaining - 1));
  }

  function openFiles() { if (fileRef.current) fileRef.current.click(); }

  const fileInput = <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={onPick} />;

  if (n === 0) {
    return (
      <div className="mx-auto mt-3 max-w-[430px]">
        {fileInput}
        <button onClick={openFiles} disabled={busy}
          className="flex w-full items-center justify-center rounded-2xl border border-dashed border-line bg-rose-soft font-bold text-rose-ink"
          style={{ aspectRatio: "16/10" }}>
          {busy ? "Bezig met uploaden…" : "＋ Voeg foto's of video's toe"}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-3 max-w-[430px]">
      {fileInput}

      <button onClick={() => setGalleryOpen(true)} aria-label="Bekijk foto's en video's"
        className="relative block w-full overflow-hidden rounded-2xl border border-line bg-rose-soft shadow-soft"
        style={{ aspectRatio: "16/10" }}>
        {photos.map((p, i) => (
          p.type === "video" ? (
            <video key={p.id} src={p.src} muted loop autoPlay={i === cur} playsInline preload="metadata"
              className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-1000", i === cur ? "opacity-100" : "opacity-0")} />
          ) : (
            <img key={p.id} src={p.src} alt="" loading={i === 0 ? undefined : "lazy"}
              className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-1000", i === cur ? "opacity-100" : "opacity-0")} />
          )
        ))}
        <span className="absolute bottom-2.5 left-3 rounded-full bg-black/30 px-3 py-1 text-[13.5px] font-bold text-white backdrop-blur-sm">Onze foto's &amp; video's · {n}</span>
        {n > 1 && (
          <span className="absolute bottom-3 right-2.5 flex gap-1.5">
            {photos.map((p, i) => <i key={i} className={cn("h-1.5 w-1.5 rounded-full", i === cur ? "bg-white" : "bg-white/55")} />)}
          </span>
        )}
        <span onClick={(e) => { e.stopPropagation(); openFiles(); }}
          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 font-bold text-rose-ink shadow-soft">
          {busy ? "…" : "＋"}
        </span>
      </button>

      {galleryOpen && createPortal((
        <div className="fixed inset-0 z-[1000] flex flex-col bg-canvas" onClick={(e) => { if (e.target === e.currentTarget) setGalleryOpen(false); }}
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="flex items-center justify-between border-b border-line px-4 py-3.5 font-bold text-ink">
            <span>Onze foto's &amp; video's · {n}</span>
            <button onClick={() => setGalleryOpen(false)} aria-label="Sluiten" className="p-1 text-muted hover:text-ink"><X size={21} /></button>
          </div>
          <div className="grid flex-1 content-start justify-center gap-1.5 overflow-y-auto p-2 pb-6"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}>
            {photos.map((p, i) => (
              <button key={p.id} onClick={() => setViewer(i)} className="relative mx-auto w-full max-w-[128px] overflow-hidden rounded-md bg-line p-0">
                <div style={{ paddingTop: "100%" }} />
                <div className="absolute inset-0">
                  {p.type === "video" ? (
                    <video src={p.src} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  ) : (
                    <img src={p.src} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                  {p.type === "video" && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/15">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/85"><Play size={12} fill="#221E2E" /></span>
                    </span>
                  )}
                </div>
              </button>
            ))}
            <button onClick={openFiles} disabled={busy} className="relative mx-auto w-full max-w-[128px] rounded-md bg-rose-soft text-rose-ink">
              <div style={{ paddingTop: "100%" }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <span className="text-2xl font-bold leading-none">{busy ? "…" : "＋"}</span>
                <small className="px-1 text-center text-[10.5px] font-semibold">{busy ? "uploaden" : "Voeg toe"}</small>
              </div>
            </button>
          </div>
        </div>
      ), document.body)}

      {viewer >= 0 && photos[viewer] && createPortal((
        <div className="fixed inset-0 z-[1100] flex flex-col bg-black/95" onClick={(e) => { if (e.target === e.currentTarget) setViewer(-1); }}
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="flex items-center justify-between px-3.5 py-3 text-white">
            <span className="text-sm font-semibold opacity-90">{viewer + 1} / {n}</span>
            <div className="flex gap-2">
              <button className="rounded-full bg-white/10 p-2.5 hover:bg-white/20" onClick={() => { if (confirm("Dit bestand verwijderen?")) removeAt(viewer); }} aria-label="Verwijderen"><Trash2 size={18} /></button>
              <button className="rounded-full bg-white/10 p-2.5 hover:bg-white/20" onClick={() => setViewer(-1)} aria-label="Sluiten"><X size={18} /></button>
            </div>
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden"
            onClick={(e) => { if (e.target === e.currentTarget) setViewer(-1); }}
            onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => { if (touchX.current == null) return; const dx = e.changedTouches[0].clientX - touchX.current; touchX.current = null; if (Math.abs(dx) > 40 && n > 1) setViewer((v) => dx < 0 ? (v + 1) % n : (v - 1 + n) % n); }}>
            {n > 1 && <button className="absolute left-2.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white" onClick={() => setViewer((v) => (v - 1 + n) % n)} aria-label="Vorige"><ChevronLeft size={26} /></button>}
            {photos[viewer].type === "video" ? (
              <video src={photos[viewer].src} controls autoPlay playsInline className="max-h-full max-w-full" />
            ) : (
              <img src={photos[viewer].src} alt="" className="max-h-full max-w-full select-none object-contain" />
            )}
            {n > 1 && <button className="absolute right-2.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white" onClick={() => setViewer((v) => (v + 1) % n)} aria-label="Volgende"><ChevronRight size={26} /></button>}
          </div>
        </div>
      ), document.body)}
    </div>
  );
}

/* ---------------- Back-up & herstel ---------------- */
function BackupWidget({ data, setData }) {
  const [open, setOpen] = useState(false);
  const jsonFileRef = useRef(null);
  const excelFileRef = useRef(null);

  function download() {
    const json = JSON.stringify(data);
    const d = new Date(), pad = (x) => String(x).padStart(2, "0");
    const name = "huwelijksplanner-backup-" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + ".json";
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function onPickJson(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(String(r.result));
        if (!obj || typeof obj !== "object" || !obj.guests || !obj.settings) { alert("Dit lijkt geen geldige back-up van de planner."); return; }
        if (!confirm("Hiermee vervang je de huidige lijst (ook bij je partner) door deze back-up. Doorgaan?")) return;
        setData(obj);
      } catch (err) { alert("Kon de back-up niet lezen: " + err.message); }
    };
    r.readAsText(file);
  }

  function downloadExcel() {
    const d = new Date(), pad = (x) => String(x).padStart(2, "0");
    exportExcel(data, "huwelijksplanner-" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + ".xlsx");
  }

  async function onPickExcel(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const partial = await importExcel(file);
      const found = Object.keys(partial).join(", ");
      if (!confirm(`Gevonden in dit Excel-bestand: ${found}.\nDit vervangt de huidige gegevens voor die onderdelen (ook bij je partner). Doorgaan?`)) return;
      setData((d) => ({ ...d, ...partial }));
    } catch (err) { alert("Kon het Excel-bestand niet lezen: " + err.message); }
  }

  return (
    <div className="fixed right-3 z-[800]" style={{ top: "calc(8px + env(safe-area-inset-top))" }}>
      <input ref={jsonFileRef} type="file" accept="application/json,.json" className="hidden" onChange={onPickJson} />
      <input ref={excelFileRef} type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={onPickExcel} />
      {open && (
        <div className="absolute right-0 top-12 min-w-[230px] overflow-hidden rounded-xl2 border border-line bg-white shadow-soft">
          <button className="block w-full border-b border-line/70 px-4 py-3 text-left text-sm font-semibold text-ink hover:bg-canvas" onClick={() => { setOpen(false); download(); }}>⬇︎ Back-up downloaden (.json)</button>
          <button className="block w-full border-b border-line/70 px-4 py-3 text-left text-sm font-semibold text-ink hover:bg-canvas" onClick={() => { setOpen(false); jsonFileRef.current && jsonFileRef.current.click(); }}>⬆︎ Back-up terugzetten (.json)</button>
          <button className="block w-full border-b border-line/70 px-4 py-3 text-left text-sm font-semibold text-ink hover:bg-canvas" onClick={() => { setOpen(false); downloadExcel(); }}>⬇︎ Exporteren naar Excel</button>
          <button className="block w-full px-4 py-3 text-left text-sm font-semibold text-ink hover:bg-canvas" onClick={() => { setOpen(false); excelFileRef.current && excelFileRef.current.click(); }}>⬆︎ Importeren vanuit Excel</button>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} title="Back-up, Excel-export/import"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-rose shadow-soft opacity-85 hover:opacity-100">
        <Cloud size={18} />
      </button>
    </div>
  );
}
