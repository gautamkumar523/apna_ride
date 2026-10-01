// ===== Apna Ride — service area geo-fence =====
// This file does NOT contain any place names, towns or villages — it's
// purely a geographic boundary definition for the 4 districts Apna Ride
// currently serves. Every actual place (town, village, colony, road,
// hospital, school, landmark, etc.) is looked up live from OpenStreetMap
// via js/location-search.js — nothing about specific places is hardcoded.
//
// These bounding boxes exist for one job: so that GPS pickup detection
// and the search results shown to riders can be restricted to only
// Patna, Aurangabad, Motihari (East Champaran) and Bettiah (West
// Champaran) districts, since that's the only area Apna Ride can
// currently dispatch a captain to.

const DISTRICT_BOUNDS = {
  "Patna":      { minLat: 25.20, maxLat: 25.75, minLon: 84.80, maxLon: 85.95 },
  "Aurangabad": { minLat: 24.45, maxLat: 25.10, minLon: 83.95, maxLon: 84.75 },
  "Motihari":   { minLat: 26.20, maxLat: 27.05, minLon: 84.60, maxLon: 85.35 },
  "Bettiah":    { minLat: 26.50, maxLat: 27.50, minLon: 83.90, maxLon: 84.75 },
};

// Combined box covering all 4 districts — sent to the search API as a
// bounding box so it only ever looks inside this region in the first place.
const SERVICE_AREA_VIEWBOX = (() => {
  const boxes = Object.values(DISTRICT_BOUNDS);
  return {
    minLat: Math.min(...boxes.map(b => b.minLat)),
    maxLat: Math.max(...boxes.map(b => b.maxLat)),
    minLon: Math.min(...boxes.map(b => b.minLon)),
    maxLon: Math.max(...boxes.map(b => b.maxLon)),
  };
})();

// True only if the point falls inside one of our 4 serviceable districts.
// Used as a second, belt-and-braces check on every search/GPS result,
// on top of the bounding box already sent to the search API.
function isInServiceArea(lat, lon){
  if (typeof lat !== 'number' || typeof lon !== 'number' || Number.isNaN(lat) || Number.isNaN(lon)) return false;
  return Object.values(DISTRICT_BOUNDS).some(b =>
    lat >= b.minLat && lat <= b.maxLat && lon >= b.minLon && lon <= b.maxLon
  );
}

const SERVICE_DISTRICTS_LABEL = "Patna, Aurangabad, Motihari & Bettiah";
