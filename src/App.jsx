import React, { useState, useEffect, useRef } from "react";
import { Heart, Users, MapPin, Wallet, CheckSquare, Star, X, Plus, ExternalLink, Check } from "lucide-react";
import { cn } from "./lib/utils";
import { Button } from "./components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Input, Textarea } from "./components/ui/input";
import { Progress } from "./components/ui/progress";
import { MONO, COUPLE_COLOR, COUPLE_EMPTY, GUEST_SEED, VENUE_SEED, VENUE_COORDS, VENUE_ADDR } from "./data";

/* ---------- opslag (werkt in Claude én als losse app) ---------- */
const STORE_KEY = "wedding-planner-tim-ita-v2";
const remoteStore = typeof window !== "undefined" && window.storage;
async function loadData() {
  try {
    if (remoteStore) { const r = await window.storage.get(STORE_KEY); return r ? JSON.parse(r.value) : null; }
    const raw = localStorage.getItem(STORE_KEY); return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
async function saveData(d) {
  try {
    if (remoteStore) { await window.storage.set(STORE_KEY, JSON.stringify(d)); return; }
    localStorage.setItem(STORE_KEY, JSON.stringify(d));
  } catch (e) { console.error("Opslaan mislukt:", e); }
}

const uid = () => Math.random().toString(36).slice(2, 9);

const defaultData = () => ({
  settings: { partnerA: "Tim", partnerB: "Ita", date: "", location: "" },
  schedule: [
    { id: uid(), time: "13:30", label: "Aankomst gasten" },
    { id: uid(), time: "14:00", label: "Ceremonie" },
    { id: uid(), time: "15:00", label: "Toost & felicitaties" },
    { id: uid(), time: "16:00", label: "Fotoshoot bruidspaar" },
    { id: uid(), time: "18:00", label: "Diner" },
    { id: uid(), time: "21:00", label: "Openingsdans" },
    { id: uid(), time: "21:30", label: "Feest" },
  ],
  guests: GUEST_SEED.map((g) => ({ id: uid(), count: 1, note: "", ...g })),
  venues: VENUE_SEED.map((v) => ({ id: uid(), ...v })),
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
export default function WeddingPlanner() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("overzicht");
  const [editSettings, setEditSettings] = useState(false);
  const ready = useRef(false);
  useEffect(() => { (async () => { const s = await loadData(); setData(s || defaultData()); ready.current = true; })(); }, []);
  useEffect(() => { if (ready.current && data) saveData(data); }, [data]);

  if (!data) return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center"><img src={MONO} className="h-20 mx-auto opacity-90" alt="monogram" /><p className="mt-3 text-sm text-muted">Even jullie plannen ophalen…</p></div>
    </div>
  );

  const set = (patch) => setData((d) => ({ ...d, ...patch }));
  const days = daysUntil(data.settings.date);
  const tabs = [["overzicht", "Overzicht", Heart], ["gasten", "Gasten", Users], ["locaties", "Locaties", MapPin], ["budget", "Budget", Wallet], ["taken", "Taken", CheckSquare]];

  return (
    <div className="min-h-screen bg-canvas pb-28">
      <div className="mx-auto max-w-[780px] px-4 pt-7">
        <header className="text-center pb-5">
          <img src={MONO} className="h-16 mx-auto" alt="Monogram Tim en Ita" />
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-rose">Wij gaan trouwen</div>
          <h1 className="mt-1 text-4xl sm:text-5xl font-extrabold tracking-tight">
            {data.settings.partnerA} <span className="text-rose italic">&amp;</span> {data.settings.partnerB}
          </h1>
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

        <div className="mt-8 text-center text-xs text-muted">
          Gemaakt met liefde · <button className="underline" onClick={() => { if (confirm("Alle gegevens wissen en opnieuw beginnen?")) setData(defaultData()); }}>opnieuw beginnen</button>
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
    </div>
  );
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
