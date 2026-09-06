// Cloudflare Pages Function: leest een Google Maps-link ÓF een "kale" website
// uit en haalt naam, adres, plaats, provincie, land, website, telefoon,
// beoordeling en coördinaten op via de Google Places API. Vereist een
// omgevingsvariabele GOOGLE_MAPS_API_KEY (in Cloudflare Pages instellen onder
// Settings → Environment variables).
//
// Twee ingangen, dezelfde uitvoer:
// - ?link=<Google Maps-link>: naam/coördinaten komen uit de link zelf.
// - ?website=<site-URL>: de pagina wordt gelezen (titel, JSON-LD-adres,
//   telefoon) om een naam/adres te raden, waarna dezelfde Places-opzoeking
//   wordt gedaan als bij een Maps-link, zodat provincie/land/beoordeling ook
//   voor een losse website automatisch ingevuld worden.
//
// Dit is de Cloudflare-versie van de vroegere Netlify Function met dezelfde
// naam: identieke logica, alleen de "verpakking" (Request/Response i.p.v.
// event/callback, env i.p.v. process.env) is anders.

function json(code, obj) {
  return new Response(JSON.stringify(obj), { status: code, headers: { "Content-Type": "application/json" } });
}
async function resolveUrl(url) {
  try { const r = await fetch(url, { redirect: "follow" }); return r.url || url; }
  catch { return url; }
}
function nameFromUrl(u) {
  const m = (u || "").match(/\/maps\/place\/([^/@]+)/);
  if (!m) return "";
  try { return decodeURIComponent(m[1].replace(/\+/g, " ")).trim(); }
  catch { return m[1].replace(/\+/g, " ").trim(); }
}
function coordsFromUrl(u) {
  const m = (u || "").match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
            (u || "").match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
            (u || "").match(/[?&](?:q|query|ll|destination)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
}
function pick(comp, type) {
  const c = (comp || []).find((x) => x.types.includes(type));
  return c ? c.long_name : "";
}

// Leest een losse website uit: naam (og:site_name/title), telefoon, en indien
// aanwezig een adres uit een JSON-LD-blok (schema.org PostalAddress) — dat
// laatste geeft vaak een preciezer adres dan een Places-zoekopdracht op naam.
async function scrapeWebsite(url) {
  const full = /^https?:\/\//i.test(url) ? url : "https://" + url;
  const res = await fetch(full, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (compatible; HuwelijksplannerBot/1.0)" } });
  const html = (await res.text()).slice(0, 200000);

  const ogSiteM = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']*)["']/i);
  const titleM = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const telM = html.match(/tel:([+\d][\d\s().-]{6,}\d)/i) || html.match(/(\+?\d[\d\s().-]{7,}\d)/);
  const title = (ogSiteM && ogSiteM[1]) || (titleM && titleM[1]) || "";

  let jsonLdAddress = null;
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  for (const raw of scripts) {
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const addr = item && item.address;
        if (addr && typeof addr === "object") {
          jsonLdAddress = {
            address: [addr.streetAddress, addr.postalCode, addr.addressLocality].filter(Boolean).join(", "),
            place: addr.addressLocality || "",
            province: addr.addressRegion || "",
            country: addr.addressCountry || "",
          };
          break;
        }
      }
    } catch { /* geen geldige JSON-LD, negeren */ }
    if (jsonLdAddress) break;
  }

  return {
    name: title.split(/[|·\-–]/)[0].trim(),
    phone: telM ? telM[1].trim() : "",
    address: jsonLdAddress,
  };
}

export async function onRequestGet(context) {
  const KEY = context.env.GOOGLE_MAPS_API_KEY;
  if (!KEY) return json(500, { error: "Geen API-sleutel ingesteld (GOOGLE_MAPS_API_KEY)." });

  const url = new URL(context.request.url);
  const link = url.searchParams.get("link") || "";
  const website = url.searchParams.get("website") || "";
  if (!link && !website) return json(400, { error: "Geen link of website opgegeven." });

  try {
    let name = "", coords = null, sitePhone = "", siteAddress = null;

    if (link) {
      const finalUrl = await resolveUrl(link);
      name = nameFromUrl(finalUrl);
      coords = coordsFromUrl(finalUrl);
    } else {
      try {
        const scraped = await scrapeWebsite(website);
        name = scraped.name; sitePhone = scraped.phone; siteAddress = scraped.address;
      } catch (e) { /* website kon niet gelezen worden, val zo mogelijk terug op Places hieronder */ }
      if (!name) return json(422, { error: "Kon geen naam van deze website afleiden." });
    }

    let placeId = null;
    if (name) {
      const bias = coords ? `&locationbias=point:${coords[0]},${coords[1]}` : "";
      const fp = await (await fetch(
        `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name)}&inputtype=textquery&fields=place_id${bias}&key=${KEY}`
      )).json();
      if (fp.candidates && fp.candidates[0]) placeId = fp.candidates[0].place_id;
    }

    if (placeId) {
      const d = await (await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,international_phone_number,address_component,website,geometry,rating,user_ratings_total,business_status&language=nl&key=${KEY}`
      )).json();
      const r = d.result || {};
      const comp = r.address_components || [];
      const g = r.geometry && r.geometry.location;
      return json(200, {
        name: r.name || name,
        address: r.formatted_address || (siteAddress && siteAddress.address) || "",
        place: pick(comp, "locality") || pick(comp, "postal_town") || pick(comp, "administrative_area_level_2") || (siteAddress && siteAddress.place) || "",
        province: pick(comp, "administrative_area_level_1") || (siteAddress && siteAddress.province) || "",
        country: pick(comp, "country") || (siteAddress && siteAddress.country) || "",
        website: r.website || (link ? "" : website),
        phone: r.formatted_phone_number || r.international_phone_number || sitePhone || "",
        rating: r.rating != null ? r.rating : null,
        userRatingsTotal: r.user_ratings_total != null ? r.user_ratings_total : null,
        businessStatus: r.business_status || "",
        lat: g ? g.lat : (coords ? coords[0] : null),
        lng: g ? g.lng : (coords ? coords[1] : null),
      });
    }

    if (coords) {
      const gc = await (await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords[0]},${coords[1]}&language=nl&key=${KEY}`
      )).json();
      const r = (gc.results && gc.results[0]) || {};
      const comp = r.address_components || [];
      return json(200, {
        name: name || "", address: r.formatted_address || "",
        place: pick(comp, "locality") || pick(comp, "postal_town"),
        province: pick(comp, "administrative_area_level_1"),
        country: pick(comp, "country"), website: "",
        phone: sitePhone || "", rating: null, userRatingsTotal: null, businessStatus: "",
        lat: coords[0], lng: coords[1],
      });
    }

    if (!link && (siteAddress || sitePhone || name)) {
      // Website zonder Places-match: geef in elk geval terug wat de pagina zelf opleverde.
      return json(200, {
        name: name || "",
        address: (siteAddress && siteAddress.address) || "",
        place: (siteAddress && siteAddress.place) || "",
        province: (siteAddress && siteAddress.province) || "",
        country: (siteAddress && siteAddress.country) || "",
        website, phone: sitePhone || "", rating: null, userRatingsTotal: null, businessStatus: "",
        lat: null, lng: null,
      });
    }

    return json(422, { error: "Kon geen locatie uit de link halen." });
  } catch (e) {
    return json(500, { error: "Ophalen mislukt: " + e.message });
  }
}
