// Live-koppeling met een Google Sheet op Drive: dezelfde vijf tabbladen als
// de Excel-export (Gasten, Locaties, Budget, Taken, Contacten), maar dan
// automatisch bijgewerkt zodra de plannergegevens veranderen — zolang er in
// elk geval één browsertab open staat met een geldige Google-koppeling.
//
// Gebruikt rechtstreeks de Google Sheets- en Drive-API's met het
// toegangstoken uit weddingAuth.js (drive.file + spreadsheets scope, dus
// alleen bestanden die deze app zelf aanmaakt — geen toegang tot de rest
// van iemands Drive).

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const DRIVE_API = "https://www.googleapis.com/drive/v3/files";

const RSVP_LABEL = { yes: "Komt", no: "Komt niet", pending: "Onbekend" };
function ynLabel(b) { return b ? "Ja" : "Nee"; }

// Zelfde kleuren als de app/Excel-export, maar als 0-1 RGB-fracties (zo wil
// de Sheets API ze hebben i.p.v. hex).
const TONE_RGB = {
  rose: { red: 0.902, green: 0.216, blue: 0.361 },   // #E6375C
  indigo: { red: 0.122, green: 0.522, blue: 1 },      // #1F85FF
  amber: { red: 1, green: 0.62, blue: 0.122 },        // #FF9E1F
};

const SHEET_DEFS = [
  {
    name: "Gasten", tone: "indigo",
    headers: ["Naam", "Aantal", "Status", "Relatie", "Kant", "Notitie"],
    rows: (data) => (data.guests || []).map((g) => [
      g.name || "", Number(g.count) || 0, RSVP_LABEL[g.rsvp] || "Onbekend", g.rel || "", g.side || "", g.diet || "",
    ]),
  },
  {
    name: "Locaties", tone: "rose",
    headers: ["Naam", "Status", "Favoriet", "Land", "Plaats", "Adres", "Website", "Opmerking Ita", "Opmerking Tim", "Coördinaten"],
    rows: (data) => (data.venues || []).map((v) => [
      v.name || "", v.status === "rejected" ? "Afgekruist" : "Interessant", ynLabel(!!v.fav),
      v.country || "", v.place || "", v.address || "", v.web || "", v.ita || "", v.tim || "", v.coords || "",
    ]),
  },
  {
    name: "Budget", tone: "amber",
    headers: ["Post", "Begroot", "Betaald"],
    rows: (data) => {
      const b = data.budget || { total: 0, saved: 0, items: [] };
      return [
        ["Totaalbudget (doel)", Number(b.total) || 0, ""],
        ["Op de rekening", Number(b.saved) || 0, ""],
        ...(b.items || []).map((x) => [x.label || "", Number(x.est) || 0, Number(x.paid) || 0]),
      ];
    },
  },
  {
    name: "Taken", tone: "indigo",
    headers: ["Taak", "Afgerond"],
    rows: (data) => (data.tasks || []).map((t) => [t.label || "", ynLabel(!!t.done)]),
  },
  {
    name: "Contacten", tone: "amber",
    headers: ["Naam", "Rol", "Telefoon", "Email", "Prijs", "Status", "Notitie"],
    rows: (data) => (data.vendors || []).map((v) => [
      v.name || "", v.role || "", v.phone || "", v.email || "", v.price || "",
      v.status === "geboekt" ? "Geboekt" : v.status === "optie" ? "Optie" : "", v.note || "",
    ]),
  },
];

async function apiFetch(url, accessToken, init) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...(init && init.headers) },
  });
  if (!res.ok) {
    let message = res.status === 401 || res.status === 403
      ? "Geen (geldige) toegang meer tot Google Sheets — opnieuw koppelen nodig."
      : `Google Sheets-API-fout (${res.status}).`;
    try { const body = await res.json(); if (body && body.error && body.error.message) message += " " + body.error.message; } catch {}
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

function headerRow(headers, tone) {
  const bg = TONE_RGB[tone];
  return {
    values: headers.map((h) => ({
      userEnteredValue: { stringValue: h },
      userEnteredFormat: {
        backgroundColor: bg,
        textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
      },
    })),
  };
}

function dataRow(cells) {
  return {
    values: cells.map((v) => (typeof v === "number"
      ? { userEnteredValue: { numberValue: v } }
      : { userEnteredValue: { stringValue: String(v ?? "") } })),
  };
}

/** Maakt een nieuwe Google Sheet met de vijf tabbladen (opgemaakt in het
 * kleurenschema van de app) en meteen gevuld met de huidige gegevens.
 * Geeft { sheetId, url } terug. */
export async function createLiveSheet(accessToken, title, data) {
  const body = {
    properties: { title },
    sheets: SHEET_DEFS.map((def) => ({
      properties: { title: def.name, gridProperties: { frozenRowCount: 1 } },
      data: [{
        startRow: 0, startColumn: 0,
        rowData: [headerRow(def.headers, def.tone), ...def.rows(data).map(dataRow)],
      }],
    })),
  };
  const json = await apiFetch(SHEETS_API, accessToken, { method: "POST", body: JSON.stringify(body) });
  return { sheetId: json.spreadsheetId, url: json.spreadsheetUrl };
}

/** Deelt de sheet als 'kan bewerken' met de opgegeven e-mailadressen.
 * Faalt een adres (bv. nog leeg), dan gaat de rest gewoon door. */
export async function shareLiveSheet(accessToken, sheetId, emails) {
  for (const email of emails) {
    if (!email) continue;
    try {
      await apiFetch(`${DRIVE_API}/${sheetId}/permissions`, accessToken, {
        method: "POST",
        body: JSON.stringify({ role: "writer", type: "user", emailAddress: email }),
      });
    } catch (e) { console.error("Delen van Google Sheet met " + email + " mislukt:", e); }
  }
}

/** Werkt een bestaande live sheet bij met de huidige gegevens. Wist eerst de
 * datarijen (niet de kopregel) zodat verwijderde items ook verdwijnen. */
export async function pushToLiveSheet(accessToken, sheetId, data) {
  await apiFetch(`${SHEETS_API}/${sheetId}/values:batchClear`, accessToken, {
    method: "POST",
    body: JSON.stringify({ ranges: SHEET_DEFS.map((def) => `${def.name}!A2:Z5000`) }),
  });
  const updates = SHEET_DEFS.map((def) => ({ range: `${def.name}!A2`, values: def.rows(data) })).filter((d) => d.values.length);
  if (!updates.length) return; // alle tabbladen leeg -> niets te schrijven
  await apiFetch(`${SHEETS_API}/${sheetId}/values:batchUpdate`, accessToken, {
    method: "POST",
    body: JSON.stringify({ valueInputOption: "RAW", data: updates }),
  });
}
