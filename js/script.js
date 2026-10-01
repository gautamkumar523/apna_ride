// ===== Apna Ride — shared behaviour =====

document.addEventListener('DOMContentLoaded', () => {

  /* mobile nav toggle & responsive drawer actions */
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks){
    // Inject mobile drawer actions if not already present
    if (!navLinks.querySelector('.mobile-drawer-actions')) {
      const drawerActions = document.createElement('div');
      drawerActions.className = 'mobile-drawer-actions';
      drawerActions.innerHTML = `
        <a href="captain.html" class="btn btn-outline btn-block" style="text-align:center;">Become a Captain</a>
        <a href="index.html#download" class="btn btn-primary btn-block" style="text-align:center;">Get the App</a>
        <a href="admin.html" style="font-size:0.85rem; color:var(--muted); text-align:center; padding:6px 0; border:none; text-decoration:underline;">Admin Console</a>
      `;
      navLinks.appendChild(drawerActions);
    }

    const closeNav = () => {
      navLinks.classList.remove('open');
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
    };

    navToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !navLinks.classList.contains('open');
      navLinks.classList.toggle('open', willOpen);
      navToggle.classList.toggle('open', willOpen);
      navToggle.setAttribute('aria-expanded', String(willOpen));
      document.body.classList.toggle('menu-open', willOpen);
    });

    navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));

    document.addEventListener('click', (e) => {
      if (navLinks.classList.contains('open') && !navLinks.contains(e.target) && !navToggle.contains(e.target)) {
        closeNav();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('open')) {
        closeNav();
      }
    });
  }


  /* fare meter readout — ticks down to show "apna price" savings */
  const meter = document.querySelector('.meter-readout');
  if (meter){
    const target = parseInt(meter.dataset.target || '49', 10);
    let current = target + 38;
    meter.textContent = '₹' + current;
    const tick = setInterval(() => {
      current -= 1;
      meter.textContent = '₹' + current;
      if (current <= target){ clearInterval(tick); }
    }, 55);
  }

  /* accordion (FAQ / safety pages) */
  document.querySelectorAll('.accordion-q').forEach(q => {
    q.addEventListener('click', () => {
      const item = q.closest('.accordion-item');
      const wasOpen = item.classList.contains('open');
      item.parentElement.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });

  /* captain earnings calculator */
  const calcInput = document.getElementById('calc-hours');
  const calcOutput = document.getElementById('calc-output');
  const calcCity = document.getElementById('calc-city');
  if (calcInput && calcOutput){
    const rates = { tier1: 95, tier2: 78, tier3: 65 };
    const update = () => {
      const hours = Math.max(0, Math.min(16, Number(calcInput.value) || 0));
      const rate = rates[calcCity ? calcCity.value : 'tier1'];
      const daily = Math.round(hours * rate);
      calcOutput.textContent = '₹' + (daily * 26).toLocaleString('en-IN');
      const dailyEl = document.getElementById('calc-daily');
      if (dailyEl) dailyEl.textContent = '₹' + daily.toLocaleString('en-IN');
    };
    calcInput.addEventListener('input', update);
    if (calcCity) calcCity.addEventListener('change', update);
    update();
  }

  /* forms: intercept submit, show a confirmation state (no backend) */
  document.querySelectorAll('form[data-demo-form]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const note = form.querySelector('.form-note');
      const btn = form.querySelector('button[type="submit"]');
      if (btn){ btn.textContent = 'Submitted ✓'; btn.disabled = true; }
      if (note){ note.textContent = "Thanks — this is a demo form, no data was sent anywhere."; }
    });
  });

  /* ride finder on home hero — routes to rides page, carrying along
     whatever pickup/drop + distance/fare estimate we've already worked out */
  const rideForm = document.querySelector('.ride-form[data-goto]');
  if (rideForm){
    rideForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const pInput = document.getElementById('pickup-input');
      const dInput = document.getElementById('drop-input');
      const params = new URLSearchParams();
      if (pInput && pInput.value) params.set('pickup', pInput.value);
      if (dInput && dInput.value) params.set('drop', dInput.value);
      if (pInput && pInput.dataset.lat) params.set('plat', pInput.dataset.lat);
      if (pInput && pInput.dataset.lon) params.set('plon', pInput.dataset.lon);
      if (dInput && dInput.dataset.lat) params.set('dlat', dInput.dataset.lat);
      if (dInput && dInput.dataset.lon) params.set('dlon', dInput.dataset.lon);
      if (heroVehicleOptions) params.set('vehicle', heroVehicleOptions.getSelected());
      const qs = params.toString();
      window.location.href = rideForm.dataset.goto + (qs ? ('?' + qs) : '');
    });
  }

  /* ===== exact pickup / drop location ===== */
  /* Powered by js/location-search.js (Photon for live search, Nominatim
     as reverse-geocode fallback) — no API key needed, no hardcoded place
     list. See that file for the search engine itself. */

  const pickupInput = document.getElementById('pickup-input');
  const dropInput    = document.getElementById('drop-input');
  const pickupList   = document.getElementById('pickup-list');
  const dropList     = document.getElementById('drop-list');
  const locateBtn    = document.getElementById('locate-btn');

  const VEHICLE_RATES = { bike: 11, auto: 17, cab: 26 }; // ₹ per km, shown across the site's fare estimate

  /* straight-line distance between two lat/lon points, in km */
  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  /* wires up a "choose your ride" block (works for both the homepage
     form and the rides.html route-summary, since both share the same
     markup): clicking a card selects it, and returns a small API to
     update fares once distance is known. */
  const initVehicleOptions = (container) => {
    if (!container) return null;
    let selected = 'bike';
    const cards = Array.from(container.querySelectorAll('.vehicle-option'));
    const applySelection = () => {
      cards.forEach(c => c.classList.toggle('selected', c.dataset.type === selected));
    };
    cards.forEach(card => {
      card.addEventListener('click', () => { selected = card.dataset.type; applySelection(); });
    });
    applySelection();
    return {
      setFares(roadKm){
        cards.forEach(async (card) => {
          const rawType = card.dataset.type;
          const apiType = rawType === 'cab' ? 'car' : rawType;
          const el = card.querySelector('[data-fare-el]');
          const localRate = VEHICLE_RATES[rawType] || 15;
          const localFare = Math.max(19, Math.round(roadKm * localRate));
          if (el) el.textContent = '₹' + localFare;

          try {
            const res = await fetch(`/fares/calculate?distanceKm=${roadKm.toFixed(1)}&vehicleType=${apiType}`);
            if (res.ok) {
              const d = await res.json();
              if (d.success && d.fare?.totalFare && el) {
                el.textContent = '₹' + d.fare.totalFare;
              }
            }
          } catch (e) {}
        });
      },
      resetFares(placeholder){
        cards.forEach(card => {
          const el = card.querySelector('[data-fare-el]');
          if (el) el.textContent = placeholder || '—';
        });
      },
      getSelected: () => selected,
      getFare(type, roadKm){ return Math.max(19, Math.round(roadKm * VEHICLE_RATES[type])); },
    };
  };

  const heroVehicleOptions = initVehicleOptions(document.getElementById('vehicle-options'));
  const distNoteEl = document.getElementById('vo-dist-note');

  /* recompute + show the distance + per-vehicle fares once both pickup and drop have coordinates */
  const updateFareEstimate = () => {
    if (!heroVehicleOptions || !pickupInput || !dropInput) return;
    const plat = parseFloat(pickupInput.dataset.lat), plon = parseFloat(pickupInput.dataset.lon);
    const dlat = parseFloat(dropInput.dataset.lat), dlon = parseFloat(dropInput.dataset.lon);
    if ([plat, plon, dlat, dlon].some(Number.isNaN)){
      heroVehicleOptions.resetFares('Select drop');
      if (distNoteEl) distNoteEl.textContent = '';
      return;
    }
    const km = haversineKm(plat, plon, dlat, dlon);
    const roadKm = km * 1.25; // rough allowance for real road distance vs straight-line
    heroVehicleOptions.setFares(roadKm);
    if (distNoteEl) distNoteEl.innerHTML = `Estimated distance: <b>${roadKm.toFixed(1)} km</b>`;
  };

  const closeList = (list) => { if (list){ list.classList.remove('open'); list.innerHTML = ''; } };

  const renderSuggestions = (list, input, results) => {
    if (!list) return;
    list.innerHTML = '';
    if (!results.length){
      list.innerHTML = '<div class="autocomplete-note">No matching places found</div>';
      list.classList.add('open');
      return;
    }
    results.forEach(place => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.setAttribute('role', 'option');
      const main = (place.display_name || '').split(',')[0];
      const rest = (place.display_name || '').split(',').slice(1, 4).join(',').trim();
      item.innerHTML = `<span class="ac-pin"></span><span><b></b><span></span></span>`;
      item.querySelector('.ac-pin').textContent = place.icon || '📍';
      item.querySelector('b').textContent = main;
      item.querySelector('span > span').textContent = rest;
      item.addEventListener('click', () => {
        input.value = place.display_name;
        input.dataset.lat = place.lat;
        input.dataset.lon = place.lon;
        closeList(list);
        updateFareEstimate();
      });
      list.appendChild(item);
    });
    list.classList.add('open');
  };

  const searchPlaces = async (query, list, input, channel) => {
    if (query.trim().length < 2){ closeList(list); return; }
    if (list){ list.innerHTML = '<div class="autocomplete-note">Searching…</div>'; list.classList.add('open'); }
    try{
      const results = await searchLocations(query, channel);
      if (results === null) return; // superseded by a newer keystroke — a fresher call is already in flight
      if (results.length){
        renderSuggestions(list, input, results);
      } else if (list){
        list.innerHTML = `<div class="autocomplete-note">No match inside our service area. Apna Ride currently operates only in ${SERVICE_DISTRICTS_LABEL} districts — nationwide coverage is coming soon.</div>`;
        list.classList.add('open');
      }
    }catch(err){
      if (list){ list.innerHTML = '<div class="autocomplete-note">Couldn\'t reach the map service — check your connection</div>'; list.classList.add('open'); }
    }
  };

  const debounce = (fn, wait) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  };

  if (pickupInput && pickupList){
    const debouncedSearch = debounce(() => searchPlaces(pickupInput.value, pickupList, pickupInput, 'pickup'), 300);
    pickupInput.addEventListener('input', debouncedSearch);
    pickupInput.addEventListener('focus', () => { if (pickupInput.value.trim().length >= 2) debouncedSearch(); });
  }
  if (dropInput && dropList){
    const debouncedSearch = debounce(() => searchPlaces(dropInput.value, dropList, dropInput, 'drop'), 300);
    dropInput.addEventListener('input', debouncedSearch);
    dropInput.addEventListener('focus', () => { if (dropInput.value.trim().length >= 2) debouncedSearch(); });
  }

  document.addEventListener('click', (e) => {
    document.querySelectorAll('.ride-form-row').forEach(row => {
      if (!row.contains(e.target)){
        row.querySelectorAll('.autocomplete-list').forEach(l => closeList(l));
      }
    });
  });

  /* Auto-detect pickup via GPS — reverse-geocodes coordinates to a real address.
     Runs automatically on page load (silent=true) so the rider never has to type
     or tap anything for pickup; the 📍 button just re-runs it on demand.
     If the GPS point falls outside our 4-district service area, we refuse to
     fill in a location and say so clearly, instead of showing an unrelated place. */
  const detectPickup = (silent) => {
    if (!pickupInput) return;
    if (!navigator.geolocation){
      if (!silent) alert('Location access isn\'t supported on this browser.');
      else pickupInput.placeholder = 'Pickup — e.g. Patliputra Colony';
      return;
    }
    if (locateBtn) locateBtn.classList.add('is-loading');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;

      if (typeof isInServiceArea === 'function' && !isInServiceArea(latitude, longitude)){
        pickupInput.value = '';
        pickupInput.placeholder = `Outside service area — we currently operate only in ${SERVICE_DISTRICTS_LABEL} districts`;
        delete pickupInput.dataset.lat;
        delete pickupInput.dataset.lon;
        if (locateBtn) locateBtn.classList.remove('is-loading');
        if (!silent) alert(`You seem to be outside our current service area. Apna Ride operates only in ${SERVICE_DISTRICTS_LABEL} districts right now.`);
        return;
      }

      let resolvedName = null;
      try{ resolvedName = await reverseGeocode(latitude, longitude); }catch(err){ /* fall back to raw coordinates below */ }

      pickupInput.value = resolvedName || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      pickupInput.dataset.lat = latitude;
      pickupInput.dataset.lon = longitude;
      if (locateBtn) locateBtn.classList.remove('is-loading');
      closeList(pickupList);
      updateFareEstimate();
    }, (err) => {
      if (locateBtn) locateBtn.classList.remove('is-loading');
      pickupInput.placeholder = 'Pickup — e.g. Patliputra Colony';
      if (!silent) alert('Couldn\'t get your exact location — please allow location access and try again.');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  };

  if (locateBtn && pickupInput){
    locateBtn.addEventListener('click', () => detectPickup(false));
    detectPickup(true); // auto-run on load, no click needed
  }

  /* ===== route summary on rides.html — shows what was searched, with distance + Bike/Auto/Cab fares ===== */
  const routeSummary = document.getElementById('route-summary');
  if (routeSummary){
    const qp = new URLSearchParams(window.location.search);
    const pickup = qp.get('pickup'), drop = qp.get('drop');
    const plat = parseFloat(qp.get('plat')), plon = parseFloat(qp.get('plon'));
    const dlat = parseFloat(qp.get('dlat')), dlon = parseFloat(qp.get('dlon'));
    const chosenVehicle = qp.get('vehicle');
    if (pickup && drop){
      const pEl = document.getElementById('rs-pickup');
      const dEl = document.getElementById('rs-drop');
      if (pEl) pEl.textContent = pickup;
      if (dEl) dEl.textContent = drop;

      const rsVehicleOptions = initVehicleOptions(document.getElementById('rs-vehicle-options'));
      if (rsVehicleOptions && chosenVehicle){
        document.querySelectorAll('#rs-vehicle-options .vehicle-option').forEach(c => {
          c.classList.toggle('selected', c.dataset.type === chosenVehicle);
        });
      }
      if (![plat, plon, dlat, dlon].some(Number.isNaN)){
        const roadKm = haversineKm(plat, plon, dlat, dlon) * 1.25;
        if (rsVehicleOptions) rsVehicleOptions.setFares(roadKm);
        const distNote = document.getElementById('rs-dist-note');
        if (distNote) distNote.innerHTML = `Estimated distance: <b>${roadKm.toFixed(1)} km</b>`;
      }
      routeSummary.classList.add('show');
    }
  }

});
