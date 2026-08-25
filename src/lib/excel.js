import * as XLSX from "xlsx";

const uid = () => Math.random().toString(36).slice(2, 9);

const RSVP_LABEL = { yes: "Komt", no: "Komt niet", pending: "Onbekend" };
const RSVP_FROM_LABEL = { "komt": "yes", "komt niet": "no", "onbekend": "pending", "": "pending" };

function ynLabel(b) { return b ? "Ja" : "Nee"; }
function ynValue(s) { return /^(ja|yes|waar|true|1)$/i.test(String(s || "").trim()); }

/**
 * Bouwt een .xlsx-bestand met alle plannergegevens in aparte tabbladen
 * (Gasten, Locaties, Budget, Taken, Contacten) en start de download.
 */
export function exportExcel(data, filename) {
  const wb = XLSX.utils.book_new();

  // --- Gasten ---
  const guestRows = [
    ["Naam", "Aantal", "Status", "Relatie", "Kant", "Notitie"],
    ...(data.guests || []).map((g) => [g.name || "", Number(g.count) || 0, RSVP_LABEL[g.rsvp] || "Onbekend", g.rel || "", g.side || "", g.diet || ""]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(guestRows), "Gasten");

  // --- Locaties ---
  const venueRows = [
    ["Naam", "Status", "Favoriet", "Land", "Plaats", "Adres", "Website", "Opmerking Ita", "Opmerking Tim", "Coördinaten"],
    ...(data.venues || []).map((v) => [
      v.name || "", v.status === "rejected" ? "Afgekruist" : "Interessant", ynLabel(!!v.fav),
      v.country || "", v.place || "", v.address || "", v.web || "", v.ita || "", v.tim || "", v.coords || "",
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(venueRows), "Locaties");

  // --- Budget (totalen bovenaan, daaronder de begrotingsposten) ---
  const b = data.budget || { total: 0, saved: 0, items: [] };
  const budgetRows = [
    ["Totaalbudget (doel)", Number(b.total) || 0],
    ["Op de rekening", Number(b.saved) || 0],
    [],
    ["Post", "Begroot", "Betaald"],
    ...(b.items || []).map((x) => [x.label || "", Number(x.est) || 0, Number(x.paid) || 0]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(budgetRows), "Budget");

  // --- Taken ---
  const taskRows = [
    ["Taak", "Afgerond"],
    ...(data.tasks || []).map((t) => [t.label || "", ynLabel(!!t.done)]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(taskRows), "Taken");

  // --- Contacten ---
  const vendorRows = [
    ["Naam", "Rol", "Telefoon", "Email", "Prijs", "Status", "Notitie"],
    ...(data.vendors || []).map((v) => [v.name || "", v.role || "", v.phone || "", v.email || "", v.price || "", v.status === "geboekt" ? "Geboekt" : v.status === "optie" ? "Optie" : "", v.note || ""]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(vendorRows), "Contacten");

  XLSX.writeFile(wb, filename || "huwelijksplanner.xlsx");
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
