// ===== Apna Ride — live location search (Uber/Rapido-style) =====
// Every place shown to the rider — town, village, colony, mohalla, road,
// chowk, market, railway station, bus stand, hospital, school, college,
// hotel, mall, temple, mosque, park, or any other landmark — is looked
// up live against real map data. Nothing here is a hardcoded list of
// places; DISTRICT_BOUNDS (from bihar-locations.js) only fences WHERE
// results are allowed to come from, it doesn't say WHAT exists there.
//
// Provider: Photon (https://photon.komoot.io), a free, keyless geocoder
// built on OpenStreetMap data. It's used instead of raw Nominatim for
// autocomplete specifically because its search index is prefix + fuzzy
// matched (small typos and partial words still resolve), which is what
// "type as you go" search needs. Nominatim is kept as a fallback for
// reverse-geocoding (GPS -> address), since its structured address
// output is more complete for that direction.
//
// Everything here is provider-agnostic at the call site: script.js only
// calls searchLocations(query) and reverseGeocode(lat, lon) — if the
// provider ever changes, only this file needs to change.

const LOCATION_SEARCH_CONFIG = {
  photonUrl: 'https://photon.komoot.io/api/',
  photonReverseUrl: 'https://photon.komoot.io/reverse',
  nominatimReverseUrl: 'https://nominatim.openstreetmap.org/reverse',
  minQueryLength: 2,
  resultLimit: 8,
  requestTimeoutMs: 6000,
  cacheTtlMs: 30 * 60 * 1000,      // 30 min — place data doesn't change minute to minute
  cacheMaxEntries: 200,
  cacheStorageKey: 'apnaride_geo_cache_v1',
};

// ---------- cache: in-memory (fast) + sessionStorage (survives page nav) ----------
const LocationCache = (() => {
  let mem = new Map();

  const loadFromSession = () => {
    try{
      const raw = sessionStorage.getItem(LOCATION_SEARCH_CONFIG.cacheStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      mem = new Map(parsed);
    }catch(err){ /* sessionStorage unavailable or corrupt — just start fresh */ }
  };

  const persist = () => {
    try{
      const entries = Array.from(mem.entries()).slice(-LOCATION_SEARCH_CONFIG.cacheMaxEntries);
      sessionStorage.setItem(LOCATION_SEARCH_CONFIG.cacheStorageKey, JSON.stringify(entries));
    }catch(err){ /* storage full or blocked — cache just won't persist across navigation */ }
  };

  loadFromSession();

  return {
    get(key){
      const hit = mem.get(key);
      if (!hit) return null;
      if (Date.now() - hit.ts > LOCATION_SEARCH_CONFIG.cacheTtlMs){ mem.delete(key); return null; }
      return hit.value;
    },
    set(key, value){
      mem.set(key, { value, ts: Date.now() });
      if (mem.size > LOCATION_SEARCH_CONFIG.cacheMaxEntries){
        const oldestKey = mem.keys().next().value;
        mem.delete(oldestKey);
      }
      persist();
    },
  };
})();

// ---------- in-flight request cancellation (per input field) ----------
// Keyed by an arbitrary "channel" name (e.g. 'pickup', 'drop') so typing
// in the pickup field doesn't cancel a request from the drop field.
const _activeControllers = {};
function _abortPrevious(channel){
  if (_activeControllers[channel]){
    _activeControllers[channel].abort();
  }
  const controller = new AbortController();
  _activeControllers[channel] = controller;
  return controller;
}

// ---------- icon per OSM tag, so results read like Uber/Rapido categories ----------
function _iconFor(osmKey, osmValue, extra){
  const k = (osmKey || '').toLowerCase(), v = (osmValue || '').toLowerCase();
  if (k === 'railway') return '🚉';
  if (k === 'aeroway') return '✈️';
  if (k === 'amenity'){
    if (['hospital','clinic','doctors','pharmacy'].includes(v)) return '🏥';
    if (v === 'school') return '🏫';
    if (['college','university'].includes(v)) return '🎓';
    if (['bus_station','bus_stop'].includes(v)) return '🚌';
    if (v === 'marketplace') return '🛍️';
    if (v === 'place_of_worship'){
      const religion = (extra && extra.religion || '').toLowerCase();
      if (religion === 'muslim') return '🕌';
      if (religion === 'christian') return '⛪';
      return '🛕';
    }
    if (v === 'bank') return '🏦';
    if (v === 'fuel') return '⛽';
    if (v === 'restaurant' || v === 'cafe') return '🍽️';
  }
  if (k === 'tourism'){
    if (['hotel','guest_house','motel'].includes(v)) return '🏨';
    return '🗺️';
  }
  if (k === 'shop'){
    if (v === 'mall') return '🛍️';
    return '🏬';
  }
  if (k === 'leisure') return '🌳';
  if (k === 'highway') return '🛣️';
  if (k === 'place') return '📍';
  return '📍';
}

// Builds a human-readable line similar to what riders expect, e.g.
// "MJK College, Bettiah, Bettiah District, Bihar"
function _displayName(props){
  const parts = [
    props.name,
    props.street,
    props.district || props.suburb,
    props.city || props.town || props.village,
    props.state,
  ].filter(Boolean);
  // de-dupe consecutive same-text parts (Photon sometimes repeats city==name for towns)
  const deduped = parts.filter((p, i) => i === 0 || p.toLowerCase() !== parts[i - 1].toLowerCase());
  return deduped.join(', ');
}

// ---------- fuzzy matching + ranking ----------
// Plain Levenshtein edit distance — used to tolerate common typos
// (transposed letters, one missing/extra character, etc.) when scoring
// how well a result matches what the rider actually typed.
function _levenshtein(a, b){
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++){
    const curr = [i];
    for (let j = 1; j <= n; j++){
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[n];
}
function _similarity(a, b){
  if (!a.length && !b.length) return 1;
  return 1 - _levenshtein(a, b) / Math.max(a.length, b.length);
}

// Ranks how relevant a result is to what was actually typed — Photon
// already narrows the candidate set, but its own ordering doesn't always
// put the closest textual match first, especially for partial words or
// small typos. This re-ranks using (in priority order): exact match,
// prefix match, substring match, per-word ("token") coverage for
// multi-word queries, and finally edit-distance similarity so a typo
// like "moihari" still surfaces "Motihari" near the top.
function _scoreMatch(query, place){
  const q = query.trim().toLowerCase();
  const name = (place.name || '').toLowerCase();
  const full = (place.display_name || '').toLowerCase();
  if (!name) return _similarity(q, full) * 200;

  if (name === q) return 1000;
  if (name.startsWith(q)) return 900 - Math.min(name.length - q.length, 50);
  if (name.includes(q)) return 750 - Math.min(name.indexOf(q) * 3, 100);

  const qTokens = q.split(/\s+/).filter(Boolean);
  if (qTokens.length > 1){
    const matched = qTokens.filter(t => name.includes(t) || full.includes(t)).length;
    if (matched === qTokens.length) return 650;
    if (matched > 0) return 300 + (matched / qTokens.length) * 300;
  }

  // Typo-tolerant fallback: only count it as a real match if it's
  // reasonably close (avoids ranking totally unrelated places highly).
  const sim = _similarity(q, name);
  if (sim >= 0.55) return 200 + sim * 300;

  // Weak signal — still keep it (Photon thought it was relevant enough
  // to return), just ranked below everything above.
  return sim * 150;
}

function _mapFeatures(features){
  return features
    .map(f => {
      const [lon, lat] = f.geometry.coordinates;
      const props = f.properties || {};
      return {
        name: props.name || '',
        display_name: _displayName(props),
        lat, lon,
        icon: _iconFor(props.osm_key, props.osm_value, props),
      };
    })
    .filter(place => place.display_name && isInServiceArea(place.lat, place.lon));
}

async function _fetchPhoton(q, centroidLat, centroidLon, vb, signal){
  const params = new URLSearchParams({
    q, lat: centroidLat, lon: centroidLon,
    bbox: `${vb.minLon},${vb.minLat},${vb.maxLon},${vb.maxLat}`,
    limit: String(LOCATION_SEARCH_CONFIG.resultLimit * 2), // fetch extra, ranking narrows it down
    lang: 'en',
  });
  const res = await fetch(`${LOCATION_SEARCH_CONFIG.photonUrl}?${params.toString()}`, {
    signal, headers: { 'Accept': 'application/json' },
  });
  const data = await res.json();
  return Array.isArray(data.features) ? data.features : [];
}

/**
 * Search for a place by free-text query, restricted to Apna Ride's
 * current 4-district service area. Results are cached (session-lifetime)
 * and in-flight requests are cancelled if a newer search starts on the
 * same channel, so fast typing never shows stale results.
 *
 * Handles partial words and common typos (e.g. "moihari", "raxaul stn")
 * by widening the candidate set with a relaxed query when the exact one
 * comes back thin, then re-ranking everything by textual relevance so
 * the best match — not just whatever Photon listed first — comes up top.
 *
 * @param {string} query        what the rider typed
 * @param {string} channel      'pickup' | 'drop' (or any per-field id)
 * @returns {Promise<Array<{display_name, lat, lon, icon}>>}
 */
async function searchLocations(query, channel){
  const q = (query || '').trim();
  if (q.length < LOCATION_SEARCH_CONFIG.minQueryLength) return [];

  const vb = SERVICE_AREA_VIEWBOX;
  const cacheKey = `search:${q.toLowerCase()}`;
  const cached = LocationCache.get(cacheKey);
  if (cached) return cached;

  const controller = _abortPrevious(channel || 'default');
  const timeout = setTimeout(() => controller.abort(), LOCATION_SEARCH_CONFIG.requestTimeoutMs);

  try{
    // Photon bbox format: minLon,minLat,maxLon,maxLat. Combined with lat/lon
    // bias at the district-area centroid so equally-named places elsewhere
    // in India rank lower even before the bbox hard-filters them out.
    const centroidLat = (vb.minLat + vb.maxLat) / 2;
    const centroidLon = (vb.minLon + vb.maxLon) / 2;

    const mainFeatures = await _fetchPhoton(q, centroidLat, centroidLon, vb, controller.signal);
    let results = _mapFeatures(mainFeatures);

    // Widen recall for partial/mistyped input: if the exact query came
    // back thin, also try (a) the query with its last character dropped
    // — catches over-typed endings — and (b) just the last word of a
    // multi-word query — catches "raxaul juction" style typos on the
    // more specific part of the query. Both run only when needed, and
    // both are merged + re-ranked together with the main results, not
    // shown separately, so the best overall match still surfaces first.
    if (results.length < 4){
      const variants = new Set();
      if (q.length >= 5 && !q.includes(' ')) variants.add(q.slice(0, -1));
      const wordParts = q.split(/\s+/).filter(Boolean);
      if (wordParts.length > 1 && wordParts[wordParts.length - 1].length >= 3){
        variants.add(wordParts[wordParts.length - 1]);
      }
      for (const variant of variants){
        try{
          const extraFeatures = await _fetchPhoton(variant, centroidLat, centroidLon, vb, controller.signal);
          results = results.concat(_mapFeatures(extraFeatures));
        }catch(err){ /* one relaxed variant failing is fine, others may still help */ }
      }
    }

    // De-dupe near-identical results (same name within ~150m of each other)
    const deduped = [];
    results.forEach(r => {
      const dup = deduped.find(d => d.display_name === r.display_name && Math.abs(d.lat - r.lat) < 0.0015 && Math.abs(d.lon - r.lon) < 0.0015);
      if (!dup) deduped.push(r);
    });

    // Rank by textual relevance to what was actually typed, then trim
    // to the limit shown in the dropdown.
    deduped.sort((a, b) => _scoreMatch(q, b) - _scoreMatch(q, a));
    results = deduped.slice(0, LOCATION_SEARCH_CONFIG.resultLimit).map(({ name, ...rest }) => rest);

    clearTimeout(timeout);
    LocationCache.set(cacheKey, results);
    return results;
  }catch(err){
    clearTimeout(timeout);
    if (err.name === 'AbortError') return null; // superseded by a newer keystroke — caller should ignore
    throw err;
  }
}

/**
 * Reverse-geocode GPS coordinates to a readable address. Tries Photon
 * first, falls back to Nominatim if that fails. Returns null if neither
 * provider can resolve it (caller decides what to show in that case).
 */
async function reverseGeocode(lat, lon){
  const cacheKey = `reverse:${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = LocationCache.get(cacheKey);
  if (cached !== null && cached !== undefined) return cached;

  try{
    const res = await fetch(`${LOCATION_SEARCH_CONFIG.photonReverseUrl}?lat=${lat}&lon=${lon}&lang=en`, {
      headers: { 'Accept': 'application/json' },
    });
    const data = await res.json();
    const feature = (data.features || [])[0];
    if (feature){
      const name = _displayName(feature.properties || {});
      if (name){ LocationCache.set(cacheKey, name); return name; }
    }
  }catch(err){ /* fall through to Nominatim */ }

  try{
    const res = await fetch(`${LOCATION_SEARCH_CONFIG.nominatimReverseUrl}?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`, {
      headers: { 'Accept': 'application/json' },
    });
    const data = await res.json();
    if (data.display_name){ LocationCache.set(cacheKey, data.display_name); return data.display_name; }
  }catch(err){ /* both providers failed — caller falls back to raw coordinates */ }

  return null;
}
