// Netlify Function: leest een Google Maps-link uit en haalt naam, adres,
// plaats, provincie, land, website en coördinaten op via de Google Places API.
// Vereist een omgevingsvariabele GOOGLE_MAPS_API_KEY (in Netlify instellen).

const KEY = process.env.GOOGLE_MAPS_API_KEY;

function json(code, obj) {
  return { statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
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

exports.handler = async (event) => {
  if (!KEY) return json(500, { error: "Geen API-sleutel ingesteld (GOOGLE_MAPS_API_KEY)." });
  const link = (event.queryStringParameters && event.queryStringParameters.link) || "";
  if (!link) return json(400, { error: "Geen link opgegeven." });

  const finalUrl = await resolveUrl(link);
  const name = nameFromUrl(finalUrl);
  const coords = coordsFromUrl(finalUrl);

  try {
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
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,address_component,website,geometry&language=nl&key=${KEY}`
      )).json();
      const r = d.result || {};
      const comp = r.address_components || [];
      const g = r.geometry && r.geometry.location;
      return json(200, {
        name: r.name || name,
        address: r.formatted_address || "",
        place: pick(comp, "locality") || pick(comp, "postal_town") || pick(comp, "administrative_area_level_2"),
        province: pick(comp, "administrative_area_level_1"),
        country: pick(comp, "country"),
        website: r.website || "",
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
        lat: coords[0], lng: coords[1],
      });
    }

    return json(422, { error: "Kon geen locatie uit de link halen." });
  } catch (e) {
    return json(500, { error: "Ophalen mislukt: " + e.message });
  }
};
