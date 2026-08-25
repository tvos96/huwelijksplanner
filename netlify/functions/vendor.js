// Netlify Function: haalt zoveel mogelijk informatie op over een leverancier/
// contact, op basis van een Google Maps-link en/of een website-URL. Gebruikt
// dezelfde Google Places API als de locaties-autofetch (place.js) voor naam,
// adres, telefoon en website, en leest daarnaast de website zelf uit (titel,
// meta-omschrijving, telefoon/e-mail op de pagina) om hiaten aan te vullen en
// een rol (fotograaf, cateraar, ...) te raden.
//
// Vereist dezelfde omgevingsvariabele als place.js: GOOGLE_MAPS_API_KEY.

const KEY = process.env.GOOGLE_MAPS_API_KEY;

const ROLES = ["Fotograaf", "Cateraar", "Muziek / DJ", "Bloemist", "Trouwambtenaar", "Taart", "Vervoer", "Decoratie"];

const KEYWORDS = {
  "Fotograaf": ["fotograaf", "fotografie", "photography", "photographer", "fotostudio"],
  "Cateraar": ["catering", "traiteur", "cateraar", "banqueting", "koks", "chef"],
  "Muziek / DJ": ["dj ", " dj", "deejay", "muziek", "music", "live band", "coverband", "band"],
  "Bloemist": ["bloemist", "bloemen", "florist", "floral", "boeket"],
  "Trouwambtenaar": ["trouwambtenaar", "ambtenaar", "buitengewoon ambtenaar", "boa", "officiant", "celebrant", "ceremonie"],
  "Taart": ["taart", "bakery", "patisserie", "banket", "cake"],
  "Vervoer": ["vervoer", "limousine", "trouwauto", "chauffeur", "trouwvervoer", "oldtimer"],
  "Decoratie": ["decoratie", "styling", "aankleding", "decor", "stylist"],
};

const PLACE_TYPE_ROLE = {
  florist: "Bloemist",
  bakery: "Taart",
  car_rental: "Vervoer",
  restaurant: "Cateraar",
  meal_delivery: "Cateraar",
  meal_takeaway: "Cateraar",
  night_club: "Muziek / DJ",
  local_government_office: "Trouwambtenaar",
  city_hall: "Trouwambtenaar",
};

function json(code, obj) {
  return { statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}

function guessRole(text) {
  const t = (text || "").toLowerCase();
  for (const role of ROLES) {
    if ((KEYWORDS[role] || []).some((kw) => t.includes(kw))) return role;
  }
  return "";
}

async function resolveUrl(url) {
  try { const r = await fetch(url, { redirect: "follow" }); return r.url || url; }
  catch { return url; }
}
function nameFromMapsUrl(u) {
  const m = (u || "").match(/\/maps\/place\/([^/@]+)/);
  if (!m) return "";
  try { return decodeURIComponent(m[1].replace(/\+/g, " ")).trim(); }
  catch { return m[1].replace(/\+/g, " ").trim(); }
}
function pick(comp, type) {
  const c = (comp || []).find((x) => x.types.includes(type));
  return c ? c.long_name : "";
}

async function lookupMaps(link) {
  const finalUrl = await resolveUrl(link);
  const name = nameFromMapsUrl(finalUrl);
  if (!name) return null;

  const fp = await (await fetch(
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name)}&inputtype=textquery&fields=place_id&key=${KEY}`
  )).json();
  const placeId = fp.candidates && fp.candidates[0] && fp.candidates[0].place_id;
  if (!placeId) return null;

  const d = await (await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,international_phone_number,address_component,website,type&language=nl&key=${KEY}`
  )).json();
  const r = d.result || {};
  const comp = r.address_components || [];
  const types = r.types || [];
  let role = "";
  for (const t of types) { if (PLACE_TYPE_ROLE[t]) { role = PLACE_TYPE_ROLE[t]; break; } }

  return {
    name: r.name || name,
    address: r.formatted_address || "",
    place: pick(comp, "locality") || pick(comp, "postal_town"),
    country: pick(comp, "country"),
    website: r.website || "",
    phone: r.formatted_phone_number || r.international_phone_number || "",
    role: role || guessRole((r.name || "") + " " + types.join(" ")),
  };
}

async function scrapeWebsite(url) {
  const full = /^https?:\/\//i.test(url) ? url : "https://" + url;
  const res = await fetch(full, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (compatible; HuwelijksplannerBot/1.0)" } });
  const html = (await res.text()).slice(0, 200000); // niet de hele pagina in geheugen nodig

  const titleM = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const ogSiteM = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']*)["']/i);
  const descM = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  const emailM = html.match(/mailto:([^"'?<>\s]+)/i);
  const telM = html.match(/tel:([+\d][\d\s().-]{6,}\d)/i) || html.match(/(\+?\d[\d\s().-]{7,}\d)/);

  const title = (ogSiteM && ogSiteM[1]) || (titleM && titleM[1]) || "";
  const desc = (descM && descM[1]) || "";

  return {
    name: title.split(/[|·\-–]/)[0].trim(),
    email: emailM ? emailM[1] : "",
    phone: telM ? telM[1].trim() : "",
    role: guessRole(title + " " + desc + " " + full),
  };
}

exports.handler = async (event) => {
  const link = (event.queryStringParameters && event.queryStringParameters.link) || "";
  const website = (event.queryStringParameters && event.queryStringParameters.website) || "";
  if (!link && !website) return json(400, { error: "Geen link of website opgegeven." });

  let fromMaps = null, fromSite = null;
  try {
    if (link && KEY) fromMaps = await lookupMaps(link);
  } catch (e) { /* val terug op website-info */ }

  try {
    const siteUrl = website || (fromMaps && fromMaps.website) || "";
    if (siteUrl) fromSite = await scrapeWebsite(siteUrl);
  } catch (e) { /* website kon niet gelezen worden, geen probleem als Maps al iets opleverde */ }

  if (!fromMaps && !fromSite) {
    return json(422, { error: "Kon geen informatie ophalen van deze link/website." });
  }

  const out = {
    name: (fromMaps && fromMaps.name) || (fromSite && fromSite.name) || "",
    role: (fromMaps && fromMaps.role) || (fromSite && fromSite.role) || "",
    phone: (fromMaps && fromMaps.phone) || (fromSite && fromSite.phone) || "",
    email: (fromSite && fromSite.email) || "",
    website: website || (fromMaps && fromMaps.website) || "",
    address: (fromMaps && fromMaps.address) || "",
  };
  return json(200, out);
};
