// ===== Apna Ride — Rider Booking & Live Tracking System =====

document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "";
  let userToken = localStorage.getItem("apna_user_token");
  let currentUser = JSON.parse(localStorage.getItem("apna_user_data") || "null");
  let activeRideInterval = null;

  // 1. Inject Auth Modal & Ride Tracker Styles
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    .apna-modal-overlay {
      position: fixed; inset: 0; background: rgba(21, 20, 31, 0.7);
      backdrop-filter: blur(4px); z-index: 10000; display: flex;
      align-items: center; justify-content: center; padding: 20px;
    }
    .apna-modal-box {
      background: var(--paper); border-radius: var(--radius-lg);
      padding: 30px; width: 100%; max-width: 440px;
      box-shadow: var(--shadow-card); border: 1px solid var(--line);
      position: relative; animation: modalPop 0.25s ease-out;
      max-height: 90vh; overflow-y: auto; -webkit-overflow-scrolling: touch;
      box-sizing: border-box;
    }
    @keyframes modalPop {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .modal-close-btn {
      position: absolute; top: 16px; right: 16px; background: #f0eee6;
      border: none; width: 34px; height: 34px; border-radius: 50%;
      cursor: pointer; font-size: 1.2rem; display: flex; align-items: center;
      justify-content: center; font-weight: 700; transition: background .15s ease;
      z-index: 10;
    }
    .modal-close-btn:hover { background: #e0ded4; }
    .pin-display-card {
      background: var(--cream); border: 2px dashed var(--vermilion);
      border-radius: var(--radius-sm); padding: 14px; text-align: center;
      margin: 16px 0;
    }
    .pin-display-number {
      font-size: 2.2rem; font-family: var(--font-mono); font-weight: 800;
      color: var(--vermilion-deep); letter-spacing: 6px; margin: 4px 0;
    }
    .pulse-radar {
      width: 70px; height: 70px; border-radius: 50%; background: rgba(255, 198, 52, 0.4);
      margin: 20px auto; position: relative; display: flex; align-items: center;
      justify-content: center; font-size: 1.8rem;
    }
    .pulse-radar::after {
      content: ''; position: absolute; inset: -10px; border-radius: 50%;
      border: 2px solid var(--yellow-deep); animation: radarPing 1.6s infinite ease-out;
    }
    @keyframes radarPing {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }
  `;
  document.head.appendChild(styleEl);

  // 2. Setup Header Auth Button / Profile Indicator
  setupHeaderNav();

  function setupHeaderNav() {
    const navActions = document.querySelector(".nav-actions");
    if (!navActions) return;

    let userNavBtn = document.getElementById("rider-nav-auth-btn");
    if (!userNavBtn) {
      userNavBtn = document.createElement("button");
      userNavBtn.id = "rider-nav-auth-btn";
      userNavBtn.className = "rider-nav-btn";
      navActions.insertBefore(userNavBtn, navActions.firstChild);
    }

    if (userToken && currentUser) {
      userNavBtn.classList.add("is-active");
      userNavBtn.innerHTML = `👤 ${currentUser.name ? currentUser.name.split(' ')[0] : 'Rider'}`;
      userNavBtn.title = `Logged in as ${currentUser.name || currentUser.mobile}. Click for Profile / PIN`;
      userNavBtn.onclick = showUserProfileModal;
    } else {
      userNavBtn.classList.remove("is-active");
      userNavBtn.innerHTML = `Login / Sign Up`;
      userNavBtn.title = "Login or register to book rides";
      userNavBtn.onclick = () => openAuthModal();
    }
  }

  // 3. Open Authentication Modal (Phone -> OTP -> Optional Name)
  function openAuthModal(onSuccess) {
    const overlay = document.createElement("div");
    overlay.className = "apna-modal-overlay";
    overlay.id = "apna-auth-modal";

    overlay.innerHTML = `
      <div class="apna-modal-box">
        <button class="modal-close-btn">&times;</button>
        <div style="text-align:center; margin-bottom:18px;">
          <span style="font-size:2rem;">🚖</span>
          <h3 style="margin:6px 0 2px;">Welcome to Apna Ride</h3>
          <p style="font-size:0.85rem; color:var(--muted); margin:0;">Enter mobile number to book rides or log in</p>
        </div>

        <!-- STEP 1: MOBILE INPUT -->
        <div id="auth-step-phone">
          <div class="form-field" style="margin-bottom:14px;">
            <label style="font-weight:600; font-size:0.85rem;">10-Digit Mobile Number</label>
            <input type="tel" id="auth-mobile" placeholder="e.g. 9876543210" maxlength="10" style="width:100%; padding:10px 14px; border:1px solid var(--line); border-radius:8px;">
          </div>
          <button id="auth-send-otp-btn" class="btn btn-primary btn-block" style="width:100%; padding:12px;">Get Verification Code →</button>
        </div>

        <!-- STEP 2: OTP INPUT -->
        <div id="auth-step-otp" style="display:none;">
          <div class="form-field" style="margin-bottom:14px;">
            <label style="font-weight:600; font-size:0.85rem;">Enter 6-Digit OTP</label>
            <input type="text" id="auth-otp" placeholder="6-digit OTP" maxlength="6" style="width:100%; padding:10px 14px; border:1px solid var(--line); border-radius:8px; font-family:var(--font-mono); letter-spacing:4px; text-align:center;">
            <small id="auth-otp-hint" style="color:var(--green); display:block; margin-top:4px; font-size:0.8rem;"></small>
          </div>
          <button id="auth-verify-otp-btn" class="btn btn-primary btn-block" style="width:100%; padding:12px;">Verify Code →</button>
        </div>

        <!-- STEP 3: REGISTER NEW USER -->
        <div id="auth-step-register" style="display:none;">
          <div class="form-field" style="margin-bottom:12px;">
            <label style="font-weight:600; font-size:0.85rem;">Your Full Name</label>
            <input type="text" id="auth-reg-name" placeholder="Your name" style="width:100%; padding:10px 14px; border:1px solid var(--line); border-radius:8px;">
          </div>
          <div class="form-field" style="margin-bottom:14px;">
            <label style="font-weight:600; font-size:0.85rem;">Gender</label>
            <select id="auth-reg-gender" style="width:100%; padding:10px 14px; border:1px solid var(--line); border-radius:8px;">
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <button id="auth-finish-reg-btn" class="btn btn-primary btn-block" style="width:100%; padding:12px;">Complete Profile &amp; Book →</button>
        </div>

        <p id="auth-modal-msg" style="color:var(--vermilion); font-size:0.85rem; margin-top:12px; text-align:center; display:none;"></p>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector(".modal-close-btn");
    closeBtn.onclick = () => overlay.remove();

    const msgEl = overlay.querySelector("#auth-modal-msg");
    const showMsg = (txt, isErr = true) => {
      msgEl.textContent = txt;
      msgEl.style.color = isErr ? "var(--vermilion)" : "var(--green)";
      msgEl.style.display = "block";
    };

    let enteredMobile = "";

    // Send OTP
    overlay.querySelector("#auth-send-otp-btn").onclick = async () => {
      const mob = overlay.querySelector("#auth-mobile").value.trim();
      if (!mob || mob.length < 10) return showMsg("Please enter a valid 10-digit mobile number.");
      enteredMobile = mob;
      showMsg("Sending verification code...", false);

      try {
        const res = await fetch(`${API_BASE}/users/send-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mobile: enteredMobile })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to send code");

        overlay.querySelector("#auth-step-phone").style.display = "none";
        overlay.querySelector("#auth-step-otp").style.display = "block";
        showMsg("Verification code sent!", false);
        if (data.otp) {
          overlay.querySelector("#auth-otp-hint").textContent = `Development OTP: ${data.otp}`;
        }
      } catch (err) {
        showMsg(err.message);
      }
    };

    // Verify OTP
    overlay.querySelector("#auth-verify-otp-btn").onclick = async () => {
      const otp = overlay.querySelector("#auth-otp").value.trim();
      if (!otp) return showMsg("Please enter the 6-digit OTP.");
      showMsg("Verifying...", false);

      try {
        const res = await fetch(`${API_BASE}/users/verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mobile: enteredMobile, otp })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Invalid verification code");

        if (data.isRegistered) {
          // Existing User Login Successful
          userToken = data.token;
          currentUser = data.user;
          localStorage.setItem("apna_user_token", userToken);
          localStorage.setItem("apna_user_data", JSON.stringify(currentUser));
          setupHeaderNav();
          overlay.remove();
          if (onSuccess) onSuccess();
        } else {
          // New User Registration Step
          overlay.querySelector("#auth-step-otp").style.display = "none";
          overlay.querySelector("#auth-step-register").style.display = "block";
          showMsg("OTP verified! Please complete your name to finish setup.", false);
        }
      } catch (err) {
        showMsg(err.message);
      }
    };

    // Finish Registration
    overlay.querySelector("#auth-finish-reg-btn").onclick = async () => {
      const name = overlay.querySelector("#auth-reg-name").value.trim();
      const gender = overlay.querySelector("#auth-reg-gender").value;
      if (!name) return showMsg("Please enter your name.");
      showMsg("Completing registration...", false);

      try {
        const res = await fetch(`${API_BASE}/users/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            mobile: enteredMobile,
            gender
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Registration failed");

        userToken = data.token;
        currentUser = data.user;
        localStorage.setItem("apna_user_token", userToken);
        localStorage.setItem("apna_user_data", JSON.stringify(currentUser));
        setupHeaderNav();
        overlay.remove();
        if (onSuccess) onSuccess();
      } catch (err) {
        showMsg(err.message);
      }
    };
  }

  // 4. User Profile & Active Ride Modal
  function showUserProfileModal() {
    const overlay = document.createElement("div");
    overlay.className = "apna-modal-overlay";
    overlay.id = "user-profile-modal";

    overlay.innerHTML = `
      <div class="apna-modal-box">
        <button class="modal-close-btn">&times;</button>
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
          <div style="background:var(--yellow); width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">👤</div>
          <div>
            <h3 style="margin:0;">${currentUser.name || "Apna Rider"}</h3>
            <span style="font-size:0.85rem; color:var(--muted);">${currentUser.mobile}</span>
          </div>
        </div>

        <div style="background:#f9f8f4; border-radius:var(--radius-sm); padding:14px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span style="font-size:0.85rem; color:var(--muted);">Permanent Ride PIN:</span>
            <b style="font-family:var(--font-mono); color:var(--vermilion); font-size:1.05rem;">${currentUser.ridePin || "—"}</b>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="font-size:0.85rem; color:var(--muted);">Referral Code:</span>
            <b style="font-family:var(--font-mono);">${currentUser.referralCode || "—"}</b>
          </div>
        </div>

        <button id="profile-check-active-ride" class="btn btn-outline btn-block" style="width:100%; margin-bottom:10px;">Check Active Ride Status</button>
        <button id="profile-logout-btn" class="btn btn-sm btn-outline btn-block" style="width:100%; color:var(--vermilion); border-color:var(--vermilion);">Log Out</button>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector(".modal-close-btn").onclick = () => overlay.remove();

    overlay.querySelector("#profile-logout-btn").onclick = () => {
      localStorage.removeItem("apna_user_token");
      localStorage.removeItem("apna_user_data");
      userToken = null;
      currentUser = null;
      setupHeaderNav();
      overlay.remove();
    };

    overlay.querySelector("#profile-check-active-ride").onclick = () => {
      overlay.remove();
      checkAndShowActiveRide();
    };
  }

  // 5. Booking Handler for Home & Rides Pages
  const heroForm = document.querySelector(".ride-form[data-goto]");
  if (heroForm) {
    // Intercept form submission on home hero
    heroForm.addEventListener("submit", (e) => {
      const pInput = document.getElementById("pickup-input");
      const dInput = document.getElementById("drop-input");

      if (!pInput || !dInput || !pInput.dataset.lat || !dInput.dataset.lat) {
        // Let standard redirect happen if user hasn't selected full coordinates yet
        return;
      }

      // If user has chosen locations, initiate booking immediately or prompt login
      e.preventDefault();
      initiateRideBooking({
        pickup: { address: pInput.value, lat: parseFloat(pInput.dataset.lat), lng: parseFloat(pInput.dataset.lon) },
        drop: { address: dInput.value, lat: parseFloat(dInput.dataset.lat), lng: parseFloat(dInput.dataset.lon) },
        vehicleType: heroForm.querySelector(".vehicle-option.selected")?.dataset.type || "bike"
      });
    });
  }

  // Handle "Book Ride" button on rides.html route summary
  const routeSummary = document.getElementById("route-summary");
  if (routeSummary) {
    let bookBtn = document.getElementById("rs-book-ride-btn");
    if (!bookBtn) {
      bookBtn = document.createElement("button");
      bookBtn.id = "rs-book-ride-btn";
      bookBtn.className = "btn btn-primary btn-block";
      bookBtn.style.marginTop = "18px";
      bookBtn.textContent = "Confirm & Request Captain →";
      routeSummary.appendChild(bookBtn);
    }

    bookBtn.addEventListener("click", () => {
      const qp = new URLSearchParams(window.location.search);
      const pickup = qp.get("pickup"), drop = qp.get("drop");
      const plat = parseFloat(qp.get("plat")), plon = parseFloat(qp.get("plon"));
      const dlat = parseFloat(qp.get("dlat")), dlon = parseFloat(qp.get("dlon"));
      const selectedVehicle = document.querySelector("#rs-vehicle-options .vehicle-option.selected")?.dataset.type || "bike";

      if (!pickup || !drop || isNaN(plat) || isNaN(dlat)) {
        alert("Please select pickup and drop locations from the home page.");
        window.location.href = "index.html";
        return;
      }

      initiateRideBooking({
        pickup: { address: pickup, lat: plat, lng: plon },
        drop: { address: drop, lat: dlat, lng: dlon },
        vehicleType: selectedVehicle
      });
    });
  }

  // 6. Request Ride & Matching Dispatcher
  function initiateRideBooking(bookingData) {
    if (!userToken) {
      openAuthModal(() => initiateRideBooking(bookingData));
      return;
    }

    // Open Live Tracking Modal
    showLiveRideModal(bookingData);
  }

  async function showLiveRideModal(bookingData) {
    let overlay = document.getElementById("apna-live-ride-modal");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "apna-modal-overlay";
      overlay.id = "apna-live-ride-modal";
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="apna-modal-box">
        <button class="modal-close-btn">&times;</button>
        <div id="live-ride-content">
          <div class="pulse-radar">🚖</div>
          <h3 style="text-align:center; margin:0 0 6px;">Finding Your Captain...</h3>
          <p style="text-align:center; font-size:0.85rem; color:var(--muted); margin:0 0 16px;">
            Scanning for available <b>${bookingData.vehicleType.toUpperCase()}</b> captains within 20 km
          </p>
          <div style="background:#fbf9f4; border-radius:8px; padding:12px; font-size:0.85rem; margin-bottom:16px;">
            <div><b>Pickup:</b> ${bookingData.pickup.address.slice(0, 36)}...</div>
            <div style="margin-top:4px;"><b>Drop:</b> ${bookingData.drop.address.slice(0, 36)}...</div>
          </div>
          <button id="cancel-booking-btn" class="btn btn-outline btn-block" style="width:100%; color:var(--vermilion); border-color:var(--vermilion);">Cancel Search</button>
        </div>
      </div>
    `;

    overlay.querySelector(".modal-close-btn").onclick = () => {
      if (confirm("Close tracking window? Your trip will continue in the background.")) {
        overlay.remove();
        if (activeRideInterval) clearInterval(activeRideInterval);
      }
    };

    overlay.querySelector("#cancel-booking-btn").onclick = async () => {
      if (overlay.dataset.rideId) {
        await cancelRide(overlay.dataset.rideId);
      }
      overlay.remove();
      if (activeRideInterval) clearInterval(activeRideInterval);
    };

    try {
      // 1. Create Ride
      const rideRes = await fetch(`${API_BASE}/rides/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({
          pickup: bookingData.pickup,
          drop: bookingData.drop,
          vehicleType: bookingData.vehicleType
        })
      });

      const rideData = await rideRes.json();
      if (!rideRes.ok) throw new Error(rideData.message || "Failed to create ride request");

      const rideId = rideData.ride._id;
      overlay.dataset.rideId = rideId;

      // 2. Dispatch Matching Search
      const matchRes = await fetch(`${API_BASE}/matching/find`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({ rideId })
      });
      const matchData = await matchRes.json();

      // 3. Start Polling Ride Lifecycle Status
      pollRideStatus(rideId);

    } catch (err) {
      overlay.querySelector("#live-ride-content").innerHTML = `
        <div style="text-align:center; padding:20px;">
          <span style="font-size:2.5rem;">⚠️</span>
          <h3 style="color:var(--vermilion); margin:10px 0;">Request Failed</h3>
          <p style="font-size:0.9rem; color:var(--muted);">${err.message}</p>
          <button class="btn btn-primary" onclick="document.getElementById('apna-live-ride-modal').remove()">Close</button>
        </div>
      `;
    }
  }

  // 7. Polling Ride Status (requested -> accepted -> arrived -> started -> completed)
  function pollRideStatus(rideId) {
    if (activeRideInterval) clearInterval(activeRideInterval);

    const checkStatus = async () => {
      const modal = document.getElementById("apna-live-ride-modal");
      if (!modal) {
        clearInterval(activeRideInterval);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/rides/${rideId}`, {
          headers: { "Authorization": `Bearer ${userToken}` }
        });
        const data = await res.json();
        if (!res.ok) return;

        const ride = data.ride;
        const contentBox = modal.querySelector("#live-ride-content");
        if (!contentBox) return;

        // STATE: ACCEPTED / CAPTAIN ON THE WAY
        if (ride.status === "accepted") {
          contentBox.innerHTML = `
            <div style="text-align:center;">
              <span style="font-size:2.4rem;">🎉</span>
              <h3 style="margin:6px 0;">Captain On The Way!</h3>
              <p style="font-size:0.85rem; color:var(--muted); margin:0 0 16px;">Captain has accepted your booking and is heading to pickup.</p>
            </div>
            <div style="background:#E4F3EC; border-radius:var(--radius-sm); padding:16px; margin-bottom:16px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <b>${ride.captain?.name || "Captain"}</b>
                <a href="tel:${ride.captain?.mobile || ''}" style="color:var(--green); font-weight:700;">📞 Call</a>
              </div>
              <div style="font-size:0.85rem;">Vehicle: <b style="text-transform:capitalize;">${ride.captain?.vehicle?.color || ''} ${ride.captain?.vehicle?.vehicleType || ''}</b></div>
              <div style="font-size:0.85rem; margin-top:4px;">Plate No: <b style="font-family:var(--font-mono);">${ride.captain?.vehicle?.plate || '—'}</b></div>
            </div>
            <div class="pin-display-card">
              <span style="font-size:0.8rem; color:var(--muted);">YOUR START RIDE PIN</span>
              <div class="pin-display-number">${ride.ridePin || (currentUser && currentUser.ridePin) || '1234'}</div>
              <small style="font-size:0.75rem; color:var(--muted);">Share this PIN with captain when you board</small>
            </div>
            <button id="cancel-accepted-btn" class="btn btn-outline btn-block" style="width:100%; color:var(--vermilion); border-color:var(--vermilion);">Cancel Ride</button>
          `;
          contentBox.querySelector("#cancel-accepted-btn").onclick = async () => {
            await cancelRide(rideId);
            modal.remove();
          };
          return;
        }

        // STATE: CAPTAIN ARRIVED AT PICKUP
        if (ride.status === "captain_arrived") {
          contentBox.innerHTML = `
            <div style="text-align:center;">
              <span style="font-size:2.4rem;">📍</span>
              <h3 style="margin:6px 0; color:var(--green);">Captain Has Arrived!</h3>
              <p style="font-size:0.85rem; color:var(--muted); margin:0 0 16px;">Your driver is waiting at pickup location.</p>
            </div>
            <div class="pin-display-card">
              <span style="font-size:0.8rem; color:var(--muted);">SHARE PIN TO START RIDE</span>
              <div class="pin-display-number">${ride.ridePin || (currentUser && currentUser.ridePin) || '1234'}</div>
            </div>
            <div style="background:#fbf9f4; padding:12px; border-radius:8px; font-size:0.85rem;">
              <b>Driver:</b> ${ride.captain?.name} · ${ride.captain?.vehicle?.plate}
            </div>
          `;
          return;
        }

        // STATE: TRIP IN PROGRESS
        if (ride.status === "started") {
          contentBox.innerHTML = `
            <div style="text-align:center;">
              <span style="font-size:2.4rem;">🛵</span>
              <h3 style="margin:6px 0; color:#63529E;">Trip in Progress</h3>
              <p style="font-size:0.85rem; color:var(--muted); margin:0 0 16px;">Enjoy your safe ride with Apna Ride!</p>
            </div>
            <div style="background:#EDE8FB; border-radius:var(--radius-sm); padding:16px; margin-bottom:16px; font-size:0.88rem;">
              <div><b>To:</b> ${ride.drop?.address}</div>
              <div style="margin-top:6px;"><b>Fare to pay:</b> ₹${ride.finalFare || ride.estimatedFare}</div>
            </div>
          `;
          return;
        }

        // STATE: COMPLETED
        if (ride.status === "completed") {
          clearInterval(activeRideInterval);
          contentBox.innerHTML = `
            <div style="text-align:center; padding:10px 0;">
              <span style="font-size:2.8rem;">🏁</span>
              <h3 style="margin:8px 0; color:var(--green);">Trip Completed!</h3>
              <p style="font-size:0.85rem; color:var(--muted); margin:0 0 18px;">Hope you had a comfortable journey.</p>
              <div style="background:var(--cream); padding:16px; border-radius:var(--radius-sm); margin-bottom:20px;">
                <span style="font-size:0.85rem; color:var(--muted);">Total Amount Payable</span>
                <div style="font-size:2rem; font-weight:800; color:var(--ink);">₹${ride.finalFare || ride.estimatedFare}</div>
                <small style="color:var(--muted);">Cash or UPI to Captain</small>
              </div>
              <button class="btn btn-primary btn-block" onclick="document.getElementById('apna-live-ride-modal').remove()">Done</button>
            </div>
          `;
          return;
        }

        // STATE: CANCELLED
        if (ride.status === "cancelled") {
          clearInterval(activeRideInterval);
          contentBox.innerHTML = `
            <div style="text-align:center; padding:10px 0;">
              <span style="font-size:2.5rem;">❌</span>
              <h3 style="margin:8px 0; color:var(--vermilion);">Ride Cancelled</h3>
              <p style="font-size:0.85rem; color:var(--muted); margin:0 0 18px;">This ride was cancelled (${ride.cancellationReason || 'No reason specified'}).</p>
              <button class="btn btn-outline btn-block" onclick="document.getElementById('apna-live-ride-modal').remove()">Close</button>
            </div>
          `;
        }

      } catch (e) {
        console.error("Error polling ride status:", e);
      }
    };

    activeRideInterval = setInterval(checkStatus, 3500);
    checkStatus();
  }

  async function cancelRide(rideId) {
    try {
      await fetch(`${API_BASE}/rides/${rideId}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({ reason: "Cancelled by rider" })
      });
    } catch (e) {
      console.error("Cancel ride error:", e);
    }
  }

  async function checkAndShowActiveRide() {
    if (!userToken) return;
    try {
      const res = await fetch(`${API_BASE}/rides/active`, {
        headers: { "Authorization": `Bearer ${userToken}` }
      });
      const data = await res.json();
      if (data.ride) {
        showLiveRideModal({
          pickup: data.ride.pickup,
          drop: data.ride.drop,
          vehicleType: data.ride.vehicleType
        });
        document.getElementById("apna-live-ride-modal").dataset.rideId = data.ride._id;
        pollRideStatus(data.ride._id);
      } else {
        alert("You have no active rides right now. Book a new ride anytime!");
      }
    } catch (err) {
      alert("Failed to fetch active ride.");
    }
  }

  // Auto check for active ride on page load if logged in
  if (userToken) {
    fetch(`${API_BASE}/rides/active`, {
      headers: { "Authorization": `Bearer ${userToken}` }
    })
    .then(r => r.json())
    .then(data => {
      if (data.ride && ["accepted", "captain_arrived", "started"].includes(data.ride.status)) {
        checkAndShowActiveRide();
      }
    })
    .catch(() => {});
  }

});
