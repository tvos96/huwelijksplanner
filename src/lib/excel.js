import * as XLSX from "xlsx";

const uid = () => Math.random().toString(36).slice(2, 9);

const RSVP_LABEL = { yes: "Komt", no: "Komt niet", pending: "Onbekend" };
const RSVP_FROM_LABEL = { "komt": "yes", "komt niet": "no", "onbekend": "pending", "": "pending" };

function ynLabel(b) { return b ? "Ja" : "Nee"; }
function ynValue(s) { return /^(ja|yes|waar|true|1)$/i.test(String(s || "").trim()); }

// Zelfde kleurenschema als de app: robijnrood (hoofd), blauw (secundair),
// goud (tertiair) — hier gebruikt als tabblad-accent zodat het bestand er
// herkenbaar uitziet.
const SHEET_COLORS = {
  rose:   { header: "FFE6375C", stripe: "FFFAE6EA" },
  indigo: { header: "FF1F85FF", stripe: "FFE3EFFD" },
  amber:  { header: "FFFF9E1F", stripe: "FFFDF1E3" },
};
const INK = "FF221E2E";
const LINE = "FFECE7F1";

function styleSheet(ws, { tone, columns, rows }) {
  ws.columns = columns;
  ws.addRows(rows);

  const colors = SHEET_COLORS[tone];
  const header = ws.getRow(1);
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.header } };
    cell.alignment = { vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: colors.header } } };
  });
  header.height = 20;
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const striped = r % 2 === 0;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { color: { argb: INK } };
      if (striped) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.stripe } };
      cell.border = { bottom: { style: "thin", color: { argb: LINE } } };
    });
  }
}

/**
 * Bouwt een .xlsx-bestand met alle plannergegevens in aparte tabbladen
 * (Gasten, Locaties, Budget, Taken, Contacten), opgemaakt in het
 * kleurenschema van de app, en start de download.
 */
export async function exportExcel(data, filename) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Huwelijksplanner";
  wb.created = new Date();

  // --- Gasten ---
  styleSheet(wb.addWorksheet("Gasten"), {
    tone: "indigo",
    columns: [
      { header: "Naam", key: "name", width: 26 },
      { header: "Aantal", key: "count", width: 10 },
      { header: "Status", key: "status", width: 14 },
      { header: "Relatie", key: "rel", width: 18 },
      { header: "Kant", key: "side", width: 12 },
      { header: "Notitie", key: "note", width: 30 },
    ],
    rows: (data.guests || []).map((g) => ({
      name: g.name || "", count: Number(g.count) || 0, status: RSVP_LABEL[g.rsvp] || "Onbekend",
      rel: g.rel || "", side: g.side || "", note: g.diet || "",
    })),
  });

  // --- Locaties ---
  styleSheet(wb.addWorksheet("Locaties"), {
    tone: "rose",
    columns: [
      { header: "Naam", key: "name", width: 26 },
      { header: "Status", key: "status", width: 14 },
      { header: "Favoriet", key: "fav", width: 10 },
      { header: "Land", key: "country", width: 14 },
      { header: "Plaats", key: "place", width: 16 },
      { header: "Adres", key: "address", width: 30 },
      { header: "Website", key: "web", width: 26 },
      { header: "Opmerking Ita", key: "ita", width: 26 },
      { header: "Opmerking Tim", key: "tim", width: 26 },
      { header: "Coördinaten", key: "coords", width: 18 },
    ],
    rows: (data.venues || []).map((v) => ({
      name: v.name || "", status: v.status === "rejected" ? "Afgekruist" : "Interessant", fav: ynLabel(!!v.fav),
      country: v.country || "", place: v.place || "", address: v.address || "", web: v.web || "",
      ita: v.ita || "", tim: v.tim || "", coords: v.coords || "",
    })),
  });

  // --- Budget (totalen bovenaan, daaronder de begrotingsposten) ---
  const b = data.budget || { total: 0, saved: 0, items: [] };
  const budgetWs = wb.addWorksheet("Budget");
  budgetWs.columns = [{ key: "a", width: 26 }, { key: "b", width: 16 }, { key: "c", width: 16 }];
  budgetWs.addRow(["Totaalbudget (doel)", Number(b.total) || 0]).font = { bold: true, color: { argb: INK } };
  budgetWs.addRow(["Op de rekening", Number(b.saved) || 0]).font = { bold: true, color: { argb: INK } };
  budgetWs.addRow([]);
  const budgetHeaderRow = budgetWs.addRow(["Post", "Begroot", "Betaald"]);
  const budgetColors = SHEET_COLORS.amber;
  budgetHeaderRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: budgetColors.header } };
  });
  (b.items || []).forEach((x, i) => {
    const row = budgetWs.addRow([x.label || "", Number(x.est) || 0, Number(x.paid) || 0]);
    if (i % 2 === 1) row.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: budgetColors.stripe } };
    });
    row.eachCell({ includeEmpty: true }, (cell) => { cell.font = { color: { argb: INK } }; });
  });
  budgetWs.views = [{ state: "frozen", ySplit: 4 }];

  // --- Taken ---
  styleSheet(wb.addWorksheet("Taken"), {
    tone: "indigo",
    columns: [
      { header: "Taak", key: "label", width: 40 },
      { header: "Afgerond", key: "done", width: 12 },
    ],
    rows: (data.tasks || []).map((t) => ({ label: t.label || "", done: ynLabel(!!t.done) })),
  });

  // --- Contacten ---
  styleSheet(wb.addWorksheet("Contacten"), {
    tone: "amber",
    columns: [
      { header: "Naam", key: "name", width: 26 },
      { header: "Rol", key: "role", width: 18 },
      { header: "Telefoon", key: "phone", width: 16 },
      { header: "Email", key: "email", width: 24 },
      { header: "Prijs", key: "price", width: 14 },
      { header: "Status", key: "status", width: 12 },
      { header: "Notitie", key: "note", width: 30 },
    ],
    rows: (data.vendors || []).map((v) => ({
      name: v.name || "", role: v.role || "", phone: v.phone || "", email: v.email || "", price: v.price || "",
      status: v.status === "geboekt" ? "Geboekt" : v.status === "optie" ? "Optie" : "", note: v.note || "",
    })),
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename || "huwelijksplanner.xlsx";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function sheetToRows(wb, name) {
  const ws = wb.Sheets[name];
  if (!ws) return null;
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: false });
}

/**
 * Leest een .xlsx-bestand (zelfde tabbladstructuur als exportExcel) en geeft
 * een object terug met de velden die gevonden zijn (guests/venues/budget/
 * tasks/vendors) — ontbrekende tabbladen worden overgeslagen, niet gewist.
 */
export async function importExcel(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const out = {};

  const guestRows = sheetToRows(wb, "Gasten");
  if (guestRows && guestRows.length > 1) {
    out.guests = guestRows.slice(1).filter((r) => (r[0] || "").toString().trim()).map((r) => ({
      id: uid(),
      name: String(r[0] || "").trim(),
      count: Number(r[1]) || 1,
      rsvp: RSVP_FROM_LABEL[String(r[2] || "").trim().toLowerCase()] || "pending",
      rel: String(r[3] || ""),
      side: String(r[4] || ""),
      diet: String(r[5] || ""),
    }));
  }

  const venueRows = sheetToRows(wb, "Locaties");
  if (venueRows && venueRows.length > 1) {
    out.venues = venueRows.slice(1).filter((r) => (r[0] || "").toString().trim()).map((r) => ({
      id: uid(),
      name: String(r[0] || "").trim(),
      status: /afgekruist/i.test(String(r[1] || "")) ? "rejected" : "open",
      fav: ynValue(r[2]),
      country: String(r[3] || ""),
      place: String(r[4] || ""),
      address: String(r[5] || ""),
      web: String(r[6] || ""),
      ita: String(r[7] || ""),
      tim: String(r[8] || ""),
      coords: String(r[9] || ""),
    }));
  }

  const budgetRows = sheetToRows(wb, "Budget");
  if (budgetRows && budgetRows.length) {
    const headerIdx = budgetRows.findIndex((r) => String(r[0] || "").trim().toLowerCase() === "post");
    const total = Number(budgetRows[0]?.[1]) || 0;
    const saved = Number(budgetRows[1]?.[1]) || 0;
    const items = headerIdx >= 0
      ? budgetRows.slice(headerIdx + 1).filter((r) => (r[0] || "").toString().trim()).map((r) => ({
          id: uid(), label: String(r[0] || ""), est: Number(r[1]) || 0, paid: Number(r[2]) || 0,
        }))
      : [];
    out.budget = { total, saved, items };
  }

  const taskRows = sheetToRows(wb, "Taken");
  if (taskRows && taskRows.length > 1) {
    out.tasks = taskRows.slice(1).filter((r) => (r[0] || "").toString().trim()).map((r) => ({
      id: uid(), label: String(r[0] || ""), done: ynValue(r[1]),
    }));
  }

  const vendorRows = sheetToRows(wb, "Contacten");
  if (vendorRows && vendorRows.length > 1) {
    out.vendors = vendorRows.slice(1).filter((r) => (r[0] || "").toString().trim()).map((r) => {
      const statusRaw = String(r[5] || "").trim().toLowerCase();
      return {
        id: uid(), name: String(r[0] || ""), role: String(r[1] || ""), phone: String(r[2] || ""),
        email: String(r[3] || ""), price: String(r[4] || ""),
        status: statusRaw === "geboekt" ? "geboekt" : statusRaw === "optie" ? "optie" : "",
        note: String(r[6] || ""),
      };
    });
  }

  if (Object.keys(out).length === 0) {
    throw new Error("Geen herkenbare tabbladen gevonden (verwacht: Gasten, Locaties, Budget, Taken, Contacten).");
  }
  return out;
}
