# CityAssist — Rebuild Prompt Guide

> 15 precise prompts to rebuild the entire app from scratch, in order.
> Copy-paste each prompt one at a time. Wait for completion before moving to the next.

---

## Phase 1: Project Setup and Core UI

### Prompt 1 — Project Initialization

```
Create a Capacitor.js hybrid mobile app called "CityAssist" with app ID "com.cityassist.app".

Tech stack:
- Single index.html (all screens in one file, SPA architecture)
- Single css/style.css for all styling
- Vanilla JavaScript (no React, no Vue, no frameworks)
- Capacitor 8.x for Android wrapper
- Google Font: Plus Jakarta Sans (weights: 400, 500, 600, 700, 800)

Setup:
1. Initialize npm project with package.json
2. Install @capacitor/core, @capacitor/cli, @capacitor/android, @capacitor/local-notifications
3. Create capacitor.config.json with webDir: "www"
4. Create a build_www.js script that copies index.html, css/, js/, audio/ folders into www/
5. Add npm scripts: "build" (runs build_www.js), "sync" (build + npx cap sync android)
6. Initialize Android project with npx cap add android
7. Create manifest.json for PWA with theme color #0F7943
8. Create sw.js service worker for offline caching

The app targets Talegaon Dabhade, Maharashtra, India as the municipal city.
Brand color: Green (#0F7943). Design should feel premium, not generic.
```

---

### Prompt 2 — Design System and Core Screens

```
Build the complete UI for CityAssist with these screens in index.html.
All screens are divs with class "app-screen" shown/hidden via JavaScript (SPA, no page reloads).

Screens to build:
1. Home Screen - Today's garbage collection status card with animated truck graphic,
   quick-action grid (Report Issue, Track Vehicle, Emergency SOS, Community),
   notification bell with badge count
2. Garbage Tracking Screen - Vehicle status hero card with distance/ETA text,
   city skyline SVG graphic with road and truck, 4-stage stepper
   (Dispatched > Nearby > Arrived Soon > Completed), live map card placeholder,
   route stops list
3. Community Feed Screen - Post cards with upvote/downvote, civic champion leaderboard
4. Services Directory - Local professionals list (plumber, electrician) with ratings, call button
5. Emergency SOS Screen - Big red SOS button, emergency type selector,
   direct call buttons (Police 112, Fire 101, Ambulance 108)
6. Issue Reporter Screen - Category picker, photo upload area, location auto-detect,
   description field, submit button
7. Municipality Command Center - KPI dashboard cards (trucks active, waste collected,
   citizen reports, SOS alerts), fleet map SVG, emergency incident feed
8. Driver Mode Screen - Driver profile card, route progress bar, stops counter,
   GPS controls (Start/Pause/Stop), stops management list

Also build:
- Bottom navigation bar (Home, Community, Track, Services, Profile) with green active state
- Side drawer menu with all navigation options
- Modal overlay system (reusable for popups)
- Toast notification system (bottom popup message)
- Screen header with back button pattern

Design requirements:
- Premium feel with gradients, shadows, rounded corners (16px radius)
- Cards with subtle box-shadow and white backgrounds
- Green (#0F7943) as primary action color
- Status badges: green for active, yellow for pending, red for SOS
- Font weights: 800 for headings, 600 for labels, 400 for body text
```

---

### Prompt 3 — App Controller (app.js)

```
Create js/app.js with a CityAssist object that handles:

1. Screen Navigation:
   - navigateTo(screenId) - hides all screens, shows target, updates bottom nav active state
   - navigateBack() - goes to previous screen using a history stack
   - historyStack array tracking navigation

2. Modal System:
   - openModal(htmlContent) - shows overlay with injected HTML
   - closeModal() - hides overlay

3. Drawer Menu:
   - openDrawer() / closeDrawer()

4. Toast Notifications:
   - showToast(message, duration) - animated bottom popup that auto-dismisses

5. Address Management:
   - Save/load home addresses from localStorage
   - Switch active address

6. Civic Request List:
   - renderRequestsList() with filter tabs (In Progress, Pending, Resolved)
   - Mock data for 5-6 sample civic complaints

Initialize on DOMContentLoaded. Default screen is 'home'.
```

---

## Phase 2: GPS Tracking Engine

### Prompt 4 — GPS Tracker Engine

```
Create js/gps_tracker.js with a GPSTrackerEngine object that handles all GPS tracking.

Properties:
- driverTelemetry: { lat, lng, speed, heading, accuracy, altitude, timestamp, status, isHardwareGPS }
- citizenLocation: { lat, lng, name } - default to Samta Colony, Talegaon (18.7285, 73.6765)
- driverCustomStops: [] - array of route stop objects
- Default location: Talegaon Station Road area (18.7340, 73.6700)

Core methods:

1. startLiveTracking(mode) - 'hardware' or 'simulation'
   - Hardware mode: navigator.geolocation.watchPosition() with enableHighAccuracy
   - Simulation mode: interpolates along pre-defined waypoints every 1.5 seconds
   - Request screen wake lock to prevent GPS sleep

2. onHardwareGPSReceived(position) - processes raw GPS coordinates
   - Auto-derive speed from GPS delta when coords.speed is null
   - Auto-derive heading from GPS delta when coords.heading is null
   - Cap speed at 80 km/h

3. calculateHaversineDistance(lat1, lon1, lat2, lon2) - returns distance in km
4. calculateDistanceMeters(lat1, lon1, lat2, lon2) - returns distance in meters
5. calculateBearing(lat1, lon1, lat2, lon2) - returns heading angle 0-360

6. handleIncomingDriverTelemetry(telemetry) - THE MAIN UPDATE METHOD
   - Calculate Haversine distance between truck and citizen home
   - Calculate ETA: distance / max(speed, 12) * 60 minutes
   - Update ALL UI elements across all screens
   - Trigger audio announcer proximity check
   - Trigger geofence notification check (within 350m)

7. broadcastAndSync(telemetry) - publishes to cloud + BroadcastChannel + localStorage

8. Stop Management:
   - addCustomStop, addCurrentLocationAsStop, markStopCompleted, deleteStop, resetStops
   - renderDriverStopsUI() - driver stop list with Done/Delete buttons
   - renderCitizenStopsUI() - citizen read-only stop timeline
   - openAddStopModal() - form to add new stop

Cross-tab sync via BroadcastChannel + localStorage storage event + 1-second polling.
Initialize on DOMContentLoaded. Restore saved data from localStorage.
```

---

## Phase 3: Cloud Relay

### Prompt 5 — Cloud Realtime Engine (ntfy.sh)

```
Create js/cloud_realtime.js with a CloudRealtime object for real-time GPS relay
using ntfy.sh (free, no API key, no server needed).

Topic: "cityassist-live-gps-001"
Endpoints:
- Publish: POST https://ntfy.sh/cityassist-live-gps-001
- Subscribe SSE: https://ntfy.sh/cityassist-live-gps-001/sse
- Subscribe WebSocket: wss://ntfy.sh/cityassist-live-gps-001/ws
- HTTP Poll: https://ntfy.sh/cityassist-live-gps-001/json?poll=1&since=2m

Methods:
1. connectCloudStream() - SSE primary + WebSocket secondary
2. startBackupPoller() - HTTP GET every 1.5s as fallback
3. publishDriverTelemetry(telemetry) - HTTP POST, rate limit 1 per 500ms
4. publishStops(stops) - broadcast driver stops to citizens
5. subscribeToTruck(callback) - register citizen callback
6. Offline Detection - window online/offline events + 5s stale data check
   - showOfflineBanner() / hideOfflineBanner()
7. Doorstep Geofence Check - trigger notification within 350m, 4-min cooldown

Auto-initialize on script load.
```

---

## Phase 4: Interactive Maps

### Prompt 6 — Leaflet Map Engine

```
Create js/leaflet_engine.js with a LeafletMapEngine object using Leaflet.js 1.9.4
and OpenStreetMap tiles (no API key needed).

3 Map Instances: citizenMap, driverMap, fullscreenMap

Truck Marker (CSS DivIcon):
- 3 concentric pulsing radar waves (green, expanding animation)
- Directional beam/cone that rotates based on heading angle
- Truck emoji in center

Methods:
1. updateTruckLocation(lat, lng, speed, heading) - smooth move, rotate beam, add breadcrumb
2. refreshCheckpoints() - render driver stops as numbered circle markers
3. panToVehicle(), panToDoorstep(), fitAllRoutes()

Breadcrumb Trail: last 50 positions as green polyline.

Floating HUD buttons on both maps:
- Citizen: "Focus Truck", "Doorstep", "Live GPS Radar" label
- Driver: "Center Vehicle", "Add Stop"

4 tile themes: OpenStreetMap, CartoDB Dark, CartoDB Light, Esri Satellite
```

---

## Phase 5: Driver Features

### Prompt 7 — Enhanced Driver Mode + Route Completion

```
Enhance Driver Mode screen with:

1. GPS Controls: Start Live GPS, Start Simulation, Pause, Stop buttons
2. Live Telemetry HUD: coordinates, speed, satellite status
3. Stops Management: numbered list with Done/Delete buttons, progress bar
4. Add Stop Modal: one-tap GPS spot + custom form with name/area/lat/lng/bins
5. Route Completion Flow:
   - When ALL stops marked done, show full-screen celebration overlay
   - Dark green gradient with confetti emoji, stats grid (stops, bins, duration, km)
   - "End Shift & Reset Route" and "Share Completion Report" buttons
   - Uses Web Share API or clipboard fallback
```

---

## Phase 6: ETA Card

### Prompt 8 — Real-Time ETA Countdown Card

```
Add a prominent ETA countdown card to the Garbage Tracking screen between
the stepper and the map card.

Dark green gradient card with white text. 2-column grid:
- Left: Big ETA number ("5" MINUTES, "Arrives ~8:45 AM")
- Right: Distance number ("1.2" KM AWAY, "Speed: 22 km/h")
- Below: Route progress bar with "Truck" and "Your Home" labels, percentage text

Updates in real-time from handleIncomingDriverTelemetry().
Switches to meters when < 1km. Shows "Arrived!" when < 100m.
Green pulsing LIVE badge in top-right corner.
```

---

## Phase 7: Notifications and Audio

### Prompt 9 — Notification Engine

```
Create js/notification_engine.js using @capacitor/local-notifications.

- Request permissions on first open
- triggerDoorstepArrivalNotification() - fires native notification even when app is closed
- sendLocalNotification(title, body, id) - generic sender
- Settings in localStorage: arrivalAlerts, communityUpdates, sosAlerts, geofenceRadiusMeters (350)
- Notification settings modal with toggle switches and test button
```

---

### Prompt 10 — Audio Announcer Engine

```
Create js/audio_announcer.js for voice proximity alerts.

- Chime via Web Audio API oscillator (6 tune variants)
- Voice TTS via window.speechSynthesis in Marathi, Hindi, English
- Triggers at ~2 minutes away and at doorstep (<150m)
- Debounce: each announcement plays only once per session
- Mute/unmute toggle, language selector, volume control, test play button
```

---

## Phase 8: Auth System

### Prompt 11 — Authentication Engine

```
Create js/auth_engine.js with 3 login flows (all mock/demo):

1. Gmail Login - Google-style OAuth button
2. Mobile OTP - 10-digit number + OTP screen (demo OTP: 4920)
3. Email + Password

Roles: Resident (default), Driver, Municipality Officer
Session persistence via localStorage. Pre-loaded demo accounts.
Registration with name, mobile, area, role selection. +100 welcome points.
```

---

## Phase 9: Supporting Components

### Prompt 12 — UI Components Library

```
Create js/components.js with reusable HTML generators for modals:

Notifications inbox, notification settings, audio settings, full-screen map,
leaderboard, QR scanner, share certificate, emergency contacts, login modal,
registration modal, forgot password, professional detail card.

Each returns HTML string. All use green CityAssist brand theme.
```

---

### Prompt 13 — Mock Data

```
Create js/data.js with static mock data:

1. civicRequests[] - 6 complaints with id, title, category, status, location
2. communityPosts[] - 5 feed posts with author, content, likes
3. serviceProfessionals[] - 4 local pros with name, rating, phone, category
4. municipalRouteWaypoints[] - 3 Talegaon stops with lat/lng coordinates
```

---

## Phase 10: Polish and Build

### Prompt 14 — Offline Fallback Banner

```
Add offline fallback banner to Garbage Tracking screen top.

Shows amber banner when offline: "Offline - Showing Last Known Location"
Shows indigo banner when data stale (>60s): "Last GPS fix: Xm Xs ago"
Auto-hides when connection and data resume. 5-second periodic stale check.
```

---

### Prompt 15 — Build APK

```
Build the final production Android APK:

1. Run npm run sync
2. Set JAVA_HOME to Android Studio JBR
3. Run gradlew assembleDebug
4. Copy APK to project root

Verify all 11 JS files pass syntax validation.
Verify script loading order in index.html is correct (data.js first, app.js last).
```

---

## Tips for Best Results

- Wait for each prompt to fully complete before sending the next one
- If something breaks, describe the exact error and which screen it happens on
- For UI refinements, share a screenshot and describe what you want changed
- Script loading order matters: data.js first, app.js last

## Estimated Build Time

| Phase | Prompts | Time |
|---|---|---|
| Project Setup + Core UI | 1-3 | ~45 min |
| GPS Tracking | 4 | ~20 min |
| Cloud Relay | 5 | ~15 min |
| Interactive Maps | 6 | ~20 min |
| Driver Features | 7 | ~20 min |
| ETA Card | 8 | ~10 min |
| Notifications + Audio | 9-10 | ~20 min |
| Auth System | 11 | ~15 min |
| Components + Data | 12-13 | ~15 min |
| Polish + Build | 14-15 | ~10 min |
| **Total** | **15 prompts** | **~3-4 hours** |
