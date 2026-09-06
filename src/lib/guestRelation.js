// Gedeelde definities voor de "Relatie tot bruid & bruidegom"-functie: een
// vaste lijst met veelvoorkomende relatietypes (van meest naar minst voor de
// hand liggend) plus een "Overig"-optie met vrije tekst voor een ontbrekend
// type. Wordt gebruikt door de gastenlijst-UI, de Excel-export/import, de
// live Google Sheets-koppeling, en de eenmalige migratie van de oude
// vrije-tekst "rel"-velden naar deze nieuwe structuur.

export const RELATION_TYPES = [
  "Ouder",
  "Broer of zus",
  "Zwager of schoonzus",
  "Grootouder",
  "Oom of tante",
  "Neef of nicht",
  "Vriend(in)",
  "Collega",
];

// Bruid/bruidegom-kant: vaste waarden die elders in de app ook al gebruikt
// worden (filters, opmerkingenvelden bij locaties), hier alleen voorzien van
// een duidelijk leesbaar label.
export const SIDE_OPTIONS = [
  { value: "Ita", label: "Bruid (Ita)" },
  { value: "Tim", label: "Bruidegom (Tim)" },
];

// Herkent oude vrije tekst (bv. "Tim - Moeder", "Tim/Ita - Vrienden") en zet
// die om naar { relType, relOther }. Bekende termen worden op het juiste
// type gematcht; onbekende tekst wordt "Overig" met de oorspronkelijke tekst
// bewaard, zodat er nooit informatie verloren gaat.
export function parseRelationText(raw) {
  const legacy = String(raw || "").trim();
  if (!legacy) return { relType: "", relOther: "" };
  const stripped = legacy.replace(/^(Tim\/Ita|Tim|Ita)\s*-\s*/i, "").trim();
  const t = stripped.toLowerCase();

  const exact = RELATION_TYPES.find((r) => r.toLowerCase() === t);
  if (exact) return { relType: exact, relOther: "" };

  if (/zwager|schoonzus/.test(t)) return { relType: "Zwager of schoonzus", relOther: "" };
  if (/moeder|vader|ouder/.test(t)) return { relType: "Ouder", relOther: "" };
  if (/broer|zus/.test(t)) return { relType: "Broer of zus", relOther: "" };
  if (/opa|oma|grootouder/.test(t)) return { relType: "Grootouder", relOther: "" };
  if (/tante|oom/.test(t)) return { relType: "Oom of tante", relOther: "" };
  if (/neef|nicht/.test(t)) return { relType: "Neef of nicht", relOther: "" };
  if (/vriend/.test(t)) return { relType: "Vriend(in)", relOther: "" };
  if (/collega/.test(t)) return { relType: "Collega", relOther: "" };
  return { relType: "Overig", relOther: stripped };
}

// Geeft de weer te geven/exporteren tekst voor een gast terug.
export function resolveRelationText(g) {
  if (!g) return "";
  if (g.relType === "Overig") return g.relOther || "Overig";
  return g.relType || "";
}
