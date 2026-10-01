// ===== Apna Ride — Captain Portal Logic =====

document.addEventListener("DOMContentLoaded", () => {
  const captainSignupSection = document.getElementById("signup");
  if (!captainSignupSection) return;

  const API_BASE = "";
  let captainToken = localStorage.getItem("apna_captain_token");

  const portalContainer = document.getElementById("captain-portal-root");
  if (!portalContainer) return;

  renderPortal();

  function renderPortal() {
    if (!captainToken) {
      renderAuthView();
    } else {
      renderDashboardView();
    }
  }

  // Auth View (Login or Register)
  function renderAuthView() {
    portalContainer.innerHTML = `
      <div class="form-card" style="width:100%; max-width:540px;">
        <div style="display:flex; gap:10px; margin-bottom:20px; border-bottom:1px solid var(--line); padding-bottom:12px;">
          <button id="cap-toggle-login" class="btn btn-sm btn-primary" style="flex:1;">Captain Login</button>
          <button id="cap-toggle-reg" class="btn btn-sm btn-outline" style="flex:1;">New Registration</button>
        </div>

        <!-- LOGIN FORM -->
        <div id="cap-login-box">
          <div id="cap-login-step-phone">
            <div class="form-field">
              <label>Registered Mobile Number</label>
              <input type="tel" id="cap-login-mobile" placeholder="10-digit mobile number" maxlength="10">
            </div>
            <button id="cap-send-otp-btn" class="btn btn-primary btn-block">Send Login OTP</button>
          </div>

          <div id="cap-login-step-otp" style="display:none;">
            <div class="form-field">
              <label>Enter 6-Digit OTP</label>
              <input type="text" id="cap-login-otp" placeholder="6-digit OTP" maxlength="6">
              <small id="cap-otp-hint" style="color:var(--green); font-size:0.8rem; display:block; margin-top:4px;"></small>
            </div>
            <button id="cap-verify-otp-btn" class="btn btn-primary btn-block">Verify &amp; Enter Dashboard</button>
          </div>
        </div>

        <!-- REGISTRATION FORM -->
        <div id="cap-reg-box" style="display:none;">
          <div class="form-field">
            <label>Full Name</label>
            <input type="text" id="cap-reg-name" placeholder="Driver / Captain Name" required>
          </div>
          <div class="form-field">
            <label>Mobile Number</label>
            <input type="tel" id="cap-reg-mobile" placeholder="10-digit phone number" maxlength="10" required>
          </div>
          <div class="form-field">
            <label>Email Address</label>
            <input type="email" id="cap-reg-email" placeholder="email@example.com" required>
          </div>
          <div class="form-field">
            <label>Gender</label>
            <select id="cap-reg-gender">
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-field" id="cap-reg-pref-wrap" style="display:none;">
            <label>Ride Preference (Women Safety)</label>
            <select id="cap-reg-pref">
              <option value="all">Accept All Passengers</option>
              <option value="female_only">Accept Female Passengers Only</option>
            </select>
          </div>
          <div class="form-field">
            <label>Vehicle Type</label>
            <select id="cap-reg-vehicle">
              <option value="bike">Bike Taxi (1 Seat)</option>
              <option value="auto">Auto Rickshaw (3 Seats)</option>
              <option value="car">Car / Cab (4 Seats)</option>
            </select>
          </div>
          <div class="form-field">
            <label>Vehicle Registration Plate</label>
            <input type="text" id="cap-reg-plate" placeholder="e.g. BR 01 AB 1234" required>
          </div>
          <div class="form-field">
            <label>Vehicle Color</label>
            <input type="text" id="cap-reg-color" placeholder="e.g. Black / Yellow" required>
          </div>
          <button id="cap-register-submit-btn" class="btn btn-primary btn-block">Complete Registration</button>
        </div>

        <p id="cap-auth-msg" style="margin-top:14px; font-size:0.85rem; text-align:center;"></p>
      </div>
    `;

    // Toggle between login and registration
    const btnLogin = document.getElementById("cap-toggle-login");
    const btnReg = document.getElementById("cap-toggle-reg");
    const boxLogin = document.getElementById("cap-login-box");
    const boxReg = document.getElementById("cap-reg-box");
    const genderSelect = document.getElementById("cap-reg-gender");
    const prefWrap = document.getElementById("cap-reg-pref-wrap");
    const msgEl = document.getElementById("cap-auth-msg");

    btnLogin.addEventListener("click", () => {
      btnLogin.className = "btn btn-sm btn-primary";
      btnReg.className = "btn btn-sm btn-outline";
      boxLogin.style.display = "block";
      boxReg.style.display = "none";
      msgEl.textContent = "";
    });

    btnReg.addEventListener("click", () => {
      btnReg.className = "btn btn-sm btn-primary";
      btnLogin.className = "btn btn-sm btn-outline";
      boxLogin.style.display = "none";
      boxReg.style.display = "block";
      msgEl.textContent = "";
    });

    genderSelect.addEventListener("change", () => {
      prefWrap.style.display = genderSelect.value === "female" ? "block" : "none";
    });

    // Send OTP
    document.getElementById("cap-send-otp-btn").addEventListener("click", async () => {
      const mobile = document.getElementById("cap-login-mobile").value.trim();
      if (!mobile || mobile.length < 10) {
        msgEl.style.color = "var(--vermilion)";
        msgEl.textContent = "Please enter a valid 10-digit mobile number.";
        return;
      }
      try {
        msgEl.textContent = "Sending OTP...";
        const res = await fetch(`${API_BASE}/captains/send-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mobile })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to send OTP");

        document.getElementById("cap-login-step-phone").style.display = "none";
        document.getElementById("cap-login-step-otp").style.display = "block";
        msgEl.style.color = "var(--green)";
        msgEl.textContent = "OTP generated successfully!";
        if (data.otp) {
          document.getElementById("cap-otp-hint").textContent = `Development OTP: ${data.otp}`;
        }
      } catch (err) {
        msgEl.style.color = "var(--vermilion)";
        msgEl.textContent = err.message;
      }
    });

    // Verify OTP
    document.getElementById("cap-verify-otp-btn").addEventListener("click", async () => {
      const mobile = document.getElementById("cap-login-mobile").value.trim();
      const otp = document.getElementById("cap-login-otp").value.trim();
      if (!otp) {
        msgEl.style.color = "var(--vermilion)";
        msgEl.textContent = "Please enter OTP.";
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/captains/verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mobile, otp })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Invalid OTP");

        captainToken = data.token;
        localStorage.setItem("apna_captain_token", captainToken);
        localStorage.setItem("apna_captain_data", JSON.stringify(data.captain));
        renderPortal();
      } catch (err) {
        msgEl.style.color = "var(--vermilion)";
        msgEl.textContent = err.message;
      }
    });

    // Register Captain
    document.getElementById("cap-register-submit-btn").addEventListener("click", async () => {
      const name = document.getElementById("cap-reg-name").value.trim();
      const mobile = document.getElementById("cap-reg-mobile").value.trim();
      const email = document.getElementById("cap-reg-email").value.trim();
      const gender = document.getElementById("cap-reg-gender").value;
      const ridePreference = document.getElementById("cap-reg-pref").value;
      const vehicleType = document.getElementById("cap-reg-vehicle").value;
      const plate = document.getElementById("cap-reg-plate").value.trim();
      const color = document.getElementById("cap-reg-color").value.trim();

      const capacityMap = { bike: 1, auto: 3, car: 4 };

      if (!name || !mobile || !email || !plate || !color) {
        msgEl.style.color = "var(--vermilion)";
        msgEl.textContent = "Please fill in all required registration fields.";
        return;
      }

      try {
        msgEl.textContent = "Registering...";
        const res = await fetch(`${API_BASE}/captains/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            mobile,
            gender,
            ridePreference: gender === "female" ? ridePreference : "all",
            vehicleType,
            color,
            plate,
            capacity: capacityMap[vehicleType] || 1
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Registration failed");

        msgEl.style.color = "var(--green)";
        msgEl.textContent = "Registration successful! Now login using OTP.";
        setTimeout(() => {
          btnLogin.click();
          document.getElementById("cap-login-mobile").value = mobile;
        }, 1200);
      } catch (err) {
        msgEl.style.color = "var(--vermilion)";
        msgEl.textContent = err.message;
      }
    });
  }

  // Dashboard View (Logged In Captain)
  async function renderDashboardView() {
    portalContainer.innerHTML = `<div class="form-card" style="width:100%; max-width:540px; text-align:center;">Loading Captain Portal...</div>`;

    try {
      const res = await fetch(`${API_BASE}/captains/profile`, {
        headers: { "Authorization": `Bearer ${captainToken}` }
      });
      const data = await res.json();
      if (!res.ok) {
        localStorage.removeItem("apna_captain_token");
        captainToken = null;
        renderPortal();
        return;
      }

      const captain = data.captain;

      portalContainer.innerHTML = `
        <div class="form-card" style="width:100%; max-width:540px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
            <div>
              <h3 style="margin:0;">${captain.name}</h3>
              <p style="margin:0; font-size:0.85rem; color:var(--muted);">${captain.mobile} · ${captain.vehicle?.vehicleType?.toUpperCase()} (${captain.vehicle?.plate})</p>
            </div>
            <button id="cap-logout-btn" class="btn btn-outline btn-sm" style="padding:4px 10px; font-size:0.8rem;">Logout</button>
          </div>

          <!-- VERIFICATION STATUS BADGE -->
          <div style="background:#f7f6f2; padding:12px; border-radius:var(--radius-sm); margin-bottom:18px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span style="font-size:0.8rem; color:var(--muted); display:block;">KYC Status</span>
              <b style="text-transform:capitalize; color:${captain.verificationStatus === 'approved' ? 'var(--green)' : 'var(--vermilion)'};">${captain.verificationStatus}</b>
            </div>
            <div>
              <span style="font-size:0.8rem; color:var(--muted); display:block;">Duty Status</span>
              <b style="text-transform:capitalize;">${captain.status}</b>
            </div>
          </div>

          <!-- PENDING DOCUMENT UPLOAD -->
          ${captain.verificationStatus === 'pending' ? `
            <div style="background:#FFF3D2; padding:14px; border-radius:var(--radius-sm); margin-bottom:18px;">
              <h4 style="margin:0 0 6px; font-size:0.95rem;">📄 Document Verification Pending</h4>
              <p style="font-size:0.82rem; margin:0 0 10px;">Upload your Driving License or RC so our admin team can approve your profile.</p>
              <form id="cap-doc-form">
                <div style="margin-bottom:8px;">
                  <label style="font-size:0.8rem; font-weight:600;">Driving License (Image or PDF)</label>
                  <input type="file" name="drivingLicense" id="cap-file-dl" style="font-size:0.85rem;">
                </div>
                <div style="margin-bottom:12px;">
                  <label style="font-size:0.8rem; font-weight:600;">Vehicle RC</label>
                  <input type="file" name="vehicleRC" id="cap-file-rc" style="font-size:0.85rem;">
                </div>
                <button type="submit" class="btn btn-sm btn-primary">Upload Documents</button>
                <span id="doc-upload-msg" style="font-size:0.8rem; margin-left:10px;"></span>
              </form>
            </div>
          ` : ''}

          <!-- APPROVED CAPTAIN CONTROLS -->
          ${captain.verificationStatus === 'approved' ? `
            <div style="display:flex; gap:10px; margin-bottom:18px;">
              <button id="cap-toggle-online" class="btn btn-block ${captain.status === 'online' ? 'btn-outline' : 'btn-primary'}">
                ${captain.status === 'online' ? '🔴 Go Offline' : '🟢 Go Online'}
              </button>
              <button id="cap-update-gps" class="btn btn-outline" title="Broadcast exact GPS location">📍 Update GPS</button>
            </div>
          ` : ''}

          <!-- LIVE TRIP DISPATCH CARD -->
          <div id="cap-active-trip-box" style="border-top:1px solid var(--line); padding-top:16px;">
            <p style="font-size:0.85rem; color:var(--muted); text-align:center;">Checking for rides in your 20km zone...</p>
          </div>
        </div>
      `;

      // Logout
      document.getElementById("cap-logout-btn").addEventListener("click", () => {
        localStorage.removeItem("apna_captain_token");
        localStorage.removeItem("apna_captain_data");
        captainToken = null;
        renderPortal();
      });

      // Online / Offline Toggle
      const onlineBtn = document.getElementById("cap-toggle-online");
      if (onlineBtn) {
        onlineBtn.addEventListener("click", async () => {
          const action = captain.status === "online" ? "go-offline" : "go-online";
          try {
            const r = await fetch(`${API_BASE}/captains/${action}`, {
              method: "PATCH",
              headers: { "Authorization": `Bearer ${captainToken}` }
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.message);
            renderDashboardView();
          } catch (err) {
            alert(err.message);
          }
        });
      }

      // Update Location
      const gpsBtn = document.getElementById("cap-update-gps");
      if (gpsBtn) {
        gpsBtn.addEventListener("click", () => {
          if (!navigator.geolocation) return alert("Geolocation not supported.");
          gpsBtn.textContent = "Locating...";
          navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            try {
              const r = await fetch(`${API_BASE}/captains/update-location`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${captainToken}`
                },
                body: JSON.stringify({ lat: latitude, lng: longitude })
              });
              const d = await r.json();
              gpsBtn.textContent = "📍 GPS Updated ✓";
              setTimeout(() => { gpsBtn.textContent = "📍 Update GPS"; }, 2500);
            } catch (e) {
              gpsBtn.textContent = "GPS Error";
            }
          }, (err) => {
            alert("Could not get GPS coordinates.");
            gpsBtn.textContent = "📍 Update GPS";
          });
        });
      }

      // Document Upload Form
      const docForm = document.getElementById("cap-doc-form");
      if (docForm) {
        docForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const dl = document.getElementById("cap-file-dl").files[0];
          const rc = document.getElementById("cap-file-rc").files[0];
          const docMsg = document.getElementById("doc-upload-msg");

          if (!dl && !rc) {
            docMsg.textContent = "Please select a file to upload.";
            return;
          }

          const fd = new FormData();
          if (dl) fd.append("drivingLicense", dl);
          if (rc) fd.append("vehicleRC", rc);

          docMsg.textContent = "Uploading...";
          try {
            const r = await fetch(`${API_BASE}/captains/upload-documents`, {
              method: "POST",
              headers: { "Authorization": `Bearer ${captainToken}` },
              body: fd
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.message);
            docMsg.style.color = "var(--green)";
            docMsg.textContent = "Uploaded! Admin will review.";
            setTimeout(() => renderDashboardView(), 1500);
          } catch (err) {
            docMsg.style.color = "var(--vermilion)";
            docMsg.textContent = err.message;
          }
        });
      }

      // Poll for active rides / incoming offers
      pollActiveRides();

    } catch (err) {
      portalContainer.innerHTML = `<div class="form-card" style="color:var(--vermilion);">Failed to load profile: ${err.message}</div>`;
    }
  }

  // Poll for Captain Active Trip or Offered Trip
  async function pollActiveRides() {
    const box = document.getElementById("cap-active-trip-box");
    if (!box || !captainToken) return;

    try {
      const res = await fetch(`${API_BASE}/rides/captain/active`, {
        headers: { "Authorization": `Bearer ${captainToken}` }
      });
      const data = await res.json();
      const ride = data.ride;

      if (!ride) {
        box.innerHTML = `<p style="font-size:0.85rem; color:var(--muted); text-align:center;">No incoming ride offers right now. Keep duty status <b>Online</b> to receive requests.</p>`;
        return;
      }

      // SCENARIO 1: RIDE IS OFFERED (Waiting for Accept / Reject)
      if (data.isOffered && ride.status === "requested") {
        box.innerHTML = `
          <div style="background:#FFF9EC; border:2px solid var(--yellow); padding:16px; border-radius:var(--radius-sm); text-align:left;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span class="badge badge-pending">NEW RIDE OFFER</span>
              <b style="font-size:1.15rem; color:var(--green);">₹${ride.estimatedFare}</b>
            </div>
            <p style="margin:0 0 6px; font-size:0.88rem;"><b>Pickup:</b> ${ride.pickup.address}</p>
            <p style="margin:0 0 10px; font-size:0.88rem;"><b>Drop:</b> ${ride.drop.address}</p>
            <p style="margin:0 0 14px; font-size:0.8rem; color:var(--muted);">Rider: ${ride.user?.name || "Customer"} · Approx ${ride.distance} km</p>
            <div style="display:flex; gap:10px;">
              <button id="cap-accept-btn" class="btn btn-sm btn-primary" style="flex:1;">Accept Ride</button>
              <button id="cap-reject-btn" class="btn btn-sm btn-outline" style="flex:1;">Decline</button>
            </div>
          </div>
        `;

        document.getElementById("cap-accept-btn").addEventListener("click", async () => {
          try {
            const r = await fetch(`${API_BASE}/rides/${ride._id}/accept`, {
              method: "PATCH",
              headers: { "Authorization": `Bearer ${captainToken}` }
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.message);
            pollActiveRides();
          } catch (e) {
            alert(e.message);
          }
        });

        document.getElementById("cap-reject-btn").addEventListener("click", async () => {
          try {
            const r = await fetch(`${API_BASE}/rides/${ride._id}/reject`, {
              method: "PATCH",
              headers: { "Authorization": `Bearer ${captainToken}` }
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.message);
            pollActiveRides();
          } catch (e) {
            alert(e.message);
          }
        });
        return;
      }

      // SCENARIO 2: RIDE IS ACCEPTED / CAPTAIN ARRIVED
      if (ride.status === "accepted" || ride.status === "captain_arrived") {
        box.innerHTML = `
          <div style="background:#E4F3EC; border:2px solid var(--green); padding:16px; border-radius:var(--radius-sm); text-align:left;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span class="badge badge-approved">${ride.status.toUpperCase().replace('_', ' ')}</span>
              <b style="font-size:1.15rem; color:var(--green);">₹${ride.estimatedFare}</b>
            </div>
            <p style="margin:0 0 6px; font-size:0.88rem;"><b>Rider:</b> ${ride.user?.name || "Customer"} (${ride.user?.mobile || ""})</p>
            <p style="margin:0 0 6px; font-size:0.88rem;"><b>Pickup:</b> ${ride.pickup.address}</p>
            <p style="margin:0 0 14px; font-size:0.88rem;"><b>Drop:</b> ${ride.drop.address}</p>

            ${ride.status === "accepted" ? `
              <button id="cap-arrived-btn" class="btn btn-sm btn-primary btn-block" style="margin-bottom:10px;">I Have Arrived at Pickup</button>
            ` : ''}

            <!-- Start Ride with PIN -->
            <div style="background:#fff; padding:12px; border-radius:8px; margin-top:10px;">
              <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:4px;">Ask customer for 4-digit Ride PIN:</label>
              <div style="display:flex; gap:8px;">
                <input type="text" id="cap-ride-pin" placeholder="e.g. 1234" maxlength="4" style="width:120px; font-family:var(--font-mono); text-align:center; font-size:1.1rem; padding:6px;">
                <button id="cap-start-btn" class="btn btn-sm btn-primary" style="flex:1;">Start Ride</button>
              </div>
              <small id="cap-pin-msg" style="color:var(--vermilion); font-size:0.78rem; display:block; margin-top:4px;"></small>
            </div>
          </div>
        `;

        const arrivedBtn = document.getElementById("cap-arrived-btn");
        if (arrivedBtn) {
          arrivedBtn.addEventListener("click", async () => {
            try {
              const r = await fetch(`${API_BASE}/rides/${ride._id}/arrived`, {
                method: "PATCH",
                headers: { "Authorization": `Bearer ${captainToken}` }
              });
              const d = await r.json();
              if (!r.ok) throw new Error(d.message);
              pollActiveRides();
            } catch (e) {
              alert(e.message);
            }
          });
        }

        document.getElementById("cap-start-btn").addEventListener("click", async () => {
          const pin = document.getElementById("cap-ride-pin").value.trim();
          const pinMsg = document.getElementById("cap-pin-msg");
          if (!pin) {
            pinMsg.textContent = "Please enter 4-digit PIN.";
            return;
          }
          try {
            const r = await fetch(`${API_BASE}/rides/${ride._id}/start`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${captainToken}`
              },
              body: JSON.stringify({ ridePin: pin })
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.message);
            pollActiveRides();
          } catch (e) {
            pinMsg.textContent = e.message;
          }
        });
        return;
      }

      // SCENARIO 3: RIDE IS IN PROGRESS (Started)
      if (ride.status === "started") {
        box.innerHTML = `
          <div style="background:#EDE8FB; border:2px solid #63529E; padding:16px; border-radius:var(--radius-sm); text-align:left;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span class="badge" style="background:#63529E; color:#fff;">TRIP IN PROGRESS</span>
              <b style="font-size:1.2rem; color:var(--ink);">₹${ride.finalFare || ride.estimatedFare}</b>
            </div>
            <p style="margin:0 0 6px; font-size:0.88rem;"><b>Passenger:</b> ${ride.user?.name || "Customer"}</p>
            <p style="margin:0 0 14px; font-size:0.88rem;"><b>Heading to:</b> ${ride.drop.address}</p>
            <button id="cap-complete-btn" class="btn btn-primary btn-block">Complete Trip &amp; Collect Fare</button>
          </div>
        `;

        document.getElementById("cap-complete-btn").addEventListener("click", async () => {
          if (!confirm("Confirm passenger drop-off and trip completion?")) return;
          try {
            const r = await fetch(`${API_BASE}/rides/${ride._id}/complete`, {
              method: "PATCH",
              headers: { "Authorization": `Bearer ${captainToken}` }
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.message);
            alert(`Trip completed! Fare of ₹${d.fare} collected.`);
            pollActiveRides();
          } catch (e) {
            alert(e.message);
          }
        });
      }

    } catch (err) {
      console.error("Error polling captain rides:", err);
    }
  }

  // Poll for incoming offers every 6 seconds when on captain portal
  setInterval(() => {
    if (captainToken) {
      pollActiveRides();
    }
  }, 6000);

});
