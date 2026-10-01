# Apna Ride (अपना राइड) 🚖

> **"Wahi ride, apna price."**  
> Hyperlocal ride-hailing and logistics platform tailored for Bihar (Patna, Aurangabad, Motihari/East Champaran, and Bettiah/West Champaran).

---

## 🌟 Key Features

1. **Multi-Vehicle Support**:
   - 🏍️ **Bike Taxi** (Solo fast commute, starting ₹30)
   - 🛺 **Auto Rickshaw** (Up to 3 passengers, covered seating)
   - 🚗 **Car / Cab** (Comfortable 4-seater)
2. **Women Safety & Preferences**:
   - Female riders can request female captains only (`female_only`).
   - Female captains can choose to accept female passengers only.
3. **District-Level Dynamic Pricing**:
   - Base fare + per-km tiered pricing with district overrides for Champaran and Aurangabad.
4. **Interactive Rider Experience**:
   - Instant GPS location detection with OpenStreetMap/Photon autocomplete.
   - Phone + OTP passwordless login.
   - Permanent 4-digit Ride PIN for safe passenger-driver onboarding verification.
   - Live Ride Tracking modal with real-time status transitions.
5. **Captain Portal**:
   - Captain onboarding with vehicle specs and KYC document uploads (DL, RC, Aadhaar).
   - Duty status toggle (Online / Offline).
   - Live GPS location broadcaster.
   - Incoming Ride Offer radar with instant Accept / Reject buttons.
   - Ride PIN verification to start trip, and completion fare collection.
6. **Admin Management Console (`admin.html`)**:
   - Operational dashboard with platform metrics (Captains, Rides, Pending Approvals).
   - Captain document review (DL, RC preview) with Approve / Reject action buttons.
   - System-wide ride monitor.
7. **Contact & Inquiries**:
   - Connected customer support and feedback submission system.

---

## 🏗️ Architecture & Tech Stack

- **Frontend**: Vanilla HTML5, CSS3 (Modern custom properties & responsive design), ES6+ JavaScript.
- **Maps & Geocoding**: Photon Geocoder (Komoot/OSM) with prefix matching & typo tolerance, Nominatim reverse geocoding, Mapbox Directions API with resilient geometric fallback.
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB with Mongoose ODM.
- **Authentication**: JWT (`jsonwebtoken`) & 6-digit OTP verification.
- **KYC Uploads**: Multer disk storage with MIME type validation (JPEG/PNG/PDF) and 5MB cap.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18+)
- **MongoDB** running on `mongodb://127.0.0.1:27017`

### 2. Install Dependencies
```bash
cd backend
npm install
```

### 3. Configure Environment Variables
Verify or adjust `backend/.env`:
```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/apna_ride
JWT_SECRET=apna_ride_secure_jwt_secret_key_2026_bihar
NODE_ENV=development
MAPBOX_ACCESS_TOKEN=
```

### 4. Seed Initial Data (Admin & Demo Captains)
Run the seeder to initialize the admin account and approved online captains:
```bash
npm run seed
```
- **Admin Email**: `admin@apnaride.com`
- **Admin Password**: `admin123`

### 5. Start the Server
```bash
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 🧪 Run Automated Integration Tests

Run the full end-to-end integration test suite verifying user auth, ride creation, 20km nearest matching, captain acceptance, PIN verification, ride completion, and admin analytics:
```bash
cd backend
node test-e2e.js
```

---

## 📂 Web Pages

| URL Path | Description |
| :--- | :--- |
| `/` or `/index.html` | Homepage with hero ride finder, live fare estimation, and rider login |
| `/rides.html` | Ride comparison, fare breakdown, and booking dispatch |
| `/captain.html` | Captain recruitment, onboarding, KYC upload, and active trip dispatch |
| `/admin.html` | Admin console for KYC approvals and platform stats |
| `/safety.html` | Safety features, SOS guidelines, and FAQs |
| `/contact.html` | Customer support inquiry form connected to backend |
| `/about.html` | Company mission, vision, and local Bihar focus |

---

## 📡 Core API Endpoints

### Rider / User (`/users`)
- `POST /users/send-otp` - Send 6-digit OTP
- `POST /users/verify-otp` - Verify OTP & obtain JWT token
- `POST /users/register` - Complete profile & generate permanent Ride PIN
- `GET /users/profile` - Authenticated user profile

### Rides & Lifecycle (`/rides`)
- `POST /rides/request` - Create ride request
- `GET /rides/active` - Fetch current active ride
- `GET /rides/:rideId` - Fetch specific ride details
- `PATCH /rides/:rideId/accept` - Captain accepts offer
- `PATCH /rides/:rideId/reject` - Captain rejects offer
- `PATCH /rides/:rideId/arrived` - Captain arrived at pickup
- `PATCH /rides/:rideId/start` - Verify Ride PIN & start trip
- `PATCH /rides/:rideId/complete` - Complete ride & collect fare
- `PATCH /rides/:rideId/cancel` - Cancel ride

### Matching (`/matching`)
- `POST /matching/find` - Match nearest online approved captain within 20km

### Captain (`/captains`)
- `POST /captains/register` - Captain registration with vehicle details
- `POST /captains/send-otp` - Captain login OTP
- `POST /captains/verify-otp` - Captain login verification
- `POST /captains/upload-documents` - Upload DL, RC, Aadhaar KYC documents
- `GET /captains/profile` - Captain profile & duty status
- `PATCH /captains/go-online` & `PATCH /captains/go-offline` - Toggle duty status
- `PATCH /captains/update-location` - Broadcast live GPS location

### Fares (`/fares`)
- `GET /fares/calculate?distanceKm=5&vehicleType=bike&district=patna` - Dynamic fare calculation

### Admin (`/admin`)
- `POST /admin/login` - Admin login
- `GET /admin/stats` - Platform counts and metrics
- `GET /admin/pending-captains` - Captains awaiting KYC review
- `GET /admin/all-captains` - Full captain directory
- `GET /admin/all-rides` - System-wide ride activity
- `PATCH /admin/approve-captain/:id` - Approve captain
- `PATCH /admin/reject-captain/:id` - Reject captain with feedback
