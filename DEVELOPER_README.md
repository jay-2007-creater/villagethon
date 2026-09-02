# CityAssist — Complete Developer Documentation

> **Smart Municipal Civic Services App** for Talegaon Dabhade, Maharashtra, India
> Built as a hybrid mobile app (Web + Android Native) using Capacitor.js

---

## Table of Contents

1. [App Overview](#1-app-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Architecture](#4-architecture)
5. [All Features](#5-all-features)
6. [JavaScript Engine Files](#6-javascript-engine-files)
7. [Cloud and Realtime](#7-cloud-and-realtime)
8. [Build and Deploy](#8-build-and-deploy)
9. [Key Configuration Files](#9-key-configuration-files)
10. [Known Limitations](#10-known-limitations)

---

## 1. App Overview

| Property | Value |
|---|---|
| **App Name** | CityAssist |
| **App ID** | `com.cityassist.app` |
| **Version** | 1.0.0 |
| **Target City** | Talegaon Dabhade, Maharashtra, India |
| **Target Users** | Citizens, Garbage Truck Drivers, Municipality Officers |
| **Platform** | Android (+ PWA capable) |
| **Language** | English (UI) / Marathi (Audio Announcements) |
| **APK Size** | ~6.8 MB |

---

## 2. Tech Stack

### Frontend (Web Layer)

| Technology | Version | Purpose |
|---|---|---|
| **HTML5** | — | App UI structure (single `index.html`, ~2300 lines) |
| **Vanilla CSS** | — | All styling (single `style.css`, ~6600 lines) |
| **Vanilla JavaScript** | ES6+ | All app logic (no frameworks, no React/Vue) |
| **Plus Jakarta Sans** | Google Fonts | Primary app typeface |
| **Leaflet.js** | 1.9.4 | Interactive GPS maps (citizen + driver views) |
| **OpenStreetMap** | — | Free tile map provider (no API key needed) |

### Mobile App Wrapper

| Technology | Version | Purpose |
|---|---|---|
| **Capacitor.js** | 8.5.0 | Wraps web app into native Android APK |
| **@capacitor/android** | 8.5.0 | Android bridge layer |
| **@capacitor/local-notifications** | 8.3.1 | Native push-style notifications |

### Android Native Layer

| Technology | Version | Purpose |
|---|---|---|
| **Android SDK** | min SDK 22 / target 35 | Native Android runtime |
| **Kotlin** | 1.9+ | Android Gradle build scripts |
| **Gradle** | 8.x | Android build system |
| **Java (JBR)** | Android Studio JBR | Java runtime for Gradle |

### Cloud and Backend (Zero-Server Architecture)

| Technology | Purpose |
|---|---|
| **ntfy.sh** | Free open-source pub/sub cloud relay for live GPS telemetry |
| **SSE (Server-Sent Events)** | Real-time GPS stream from driver to citizen |
| **WebSocket** | Secondary fallback relay channel |
| **localStorage** | Client-side persistent storage for GPS, stops, user settings |
| **BroadcastChannel API** | Zero-latency cross-tab/window sync (same device) |

### PWA (Progressive Web App)

| Technology | Purpose |
|---|---|
| **Web App Manifest** (`manifest.json`) | Installable PWA metadata |
| **Service Worker** (`sw.js`) | Offline caching and background sync |
| **Web Push / Local Notifications** | Background arrival alerts |

---

## 3. Project Structure

```
cityassist-app/
|
|-- index.html                    <-- MAIN SOURCE: Entire app UI (all screens)
|
|-- css/
|   +-- style.css                 <-- MAIN SOURCE: All styles and animations (~6600 lines)
|
|-- js/
|   |-- app.js                    <-- App controller, routing, UI logic (~2700 lines)
|   |-- components.js             <-- Reusable UI modals and popups (~1500 lines)
|   |-- gps_tracker.js            <-- GPS engine: tracking, ETA, stops (~1100 lines)
|   |-- cloud_realtime.js         <-- ntfy.sh cloud relay, offline detection (~400 lines)
|   |-- leaflet_engine.js         <-- Interactive map: radar, breadcrumbs, beams (~800 lines)
|   |-- notification_engine.js    <-- Local notifications and Web Push (~400 lines)
|   |-- audio_announcer.js        <-- Voice alerts: chime + TTS announcements (~450 lines)
|   |-- auth_engine.js            <-- Login, registration, role switching (~560 lines)
|   |-- data.js                   <-- Static mock data: requests, stops, community posts
|   |-- ai_engine.js              <-- AI complaint assistant mock
|   +-- google_maps_engine.js     <-- Fallback Google Maps integration (not primary)
|
|-- audio/                        <-- Pre-recorded Marathi voice alert audio files
|
|-- manifest.json                 <-- PWA Web App Manifest
|-- sw.js                         <-- Service Worker (offline cache + background sync)
|-- capacitor.config.json         <-- Capacitor app config
|-- package.json                  <-- npm dependencies
|-- build_www.js                  <-- Build script: copies source to www/
|
|-- www/                          <-- AUTO-GENERATED (do not edit directly)
|   +-- [copy of index.html, css/, js/, audio/]
|
+-- android/                      <-- Android Studio project (open THIS in Android Studio)
    |-- app/
    |   |-- src/main/
    |   |   |-- AndroidManifest.xml    <-- Permissions, app config
    |   |   |-- assets/public/         <-- Web files synced by Capacitor
    |   |   +-- res/                   <-- Icons, splash screens
    |   +-- build.gradle               <-- Android app build config
    +-- build.gradle                   <-- Root Android build config
```

### Important Rules

- **Always edit** `index.html`, `css/style.css`, and `js/*.js` in the **root** folder
- **Never edit** files inside `www/` or `android/.../assets/public/` — they are auto-generated
- **Android-specific** changes (icons, permissions, app name) go in the `android/` folder
- Run `npm run sync` after any web file change to copy into the Android project

---

## 4. Architecture

### Data Flow: Driver GPS to Citizen Screen

```
DRIVER'S PHONE                    INTERNET (ntfy.sh)            CITIZEN'S PHONE
--------------                    ------------------            ---------------

GPS Hardware Sensor
        |
        v
GPSTrackerEngine
  .onHardwareGPSReceived()
        |
        v
CloudRealtime
  .publishDriverTelemetry()  ---HTTP POST--->  ntfy.sh topic
        +                                      (cityassist-live-gps-001)
  BroadcastChannel                                    |
  + localStorage write                    SSE stream + WebSocket
                                                      |
                                                      v
                                          CloudRealtime.subscribeToTruck()
                                                      |
                                                      v
                                          GPSTrackerEngine
                                            .handleIncomingDriverTelemetry()
                                                      |
                                          +-----------+-----------+
                                          |           |           |
                                          v           v           v
                                   LeafletMap    ETA Card   Audio Alert
                                   .updateTruck  update     .onProximity
                                   Location()               Update()
                                                      |
                                                      v
                                               NotificationEngine
                                               geofence check (350m)
```

### Screen Navigation Architecture

The app is a **Single Page Application (SPA)** with no page reloads.
All "screens" are `<div class="app-screen">` elements shown/hidden via JavaScript.

```
CityAssist.navigateTo(screenId)
  --> Hides all screens via CSS class toggling
  --> Shows target screen
  --> Updates bottom nav active state
  --> Triggers screen-specific initializers
```

### User Role System

There are **3 user roles**, switched via Auth Engine:

| Role | Access | Features Unlocked |
|---|---|---|
| **Resident (Default)** | Home, Garbage Tracking, Community, Services | Track truck, report issues, SOS |
| **Driver** | Driver Mode screen | Live GPS broadcast, manage stops, mark done |
| **Municipality Officer** | Municipality Command Center | Fleet map, stats dashboard, SOS feed |

---

## 5. All Features

### Home Screen

- Today's garbage collection widget with animated truck
- Live proximity display: "Truck is 1.2 km away (5 min)"
- Quick-action grid: Report Issue, Track Truck, SOS, Community
- Notification center with badge count
- Address management (save/switch home address)

### Garbage Tracking Screen

- **Live ETA Countdown Card** — big number countdown showing minutes, distance, truck speed, arrival time estimate, and route progress bar
- Collection status stepper (4 stages: Dispatched -> Nearby -> Arrived Soon -> Completed)
- **Interactive Leaflet Map** with:
  - 3-wave pulsing radar truck marker
  - Directional heading beam
  - Live breadcrumb trail
  - Home pin marker
  - "Focus Truck" and "Doorstep" HUD buttons
- Citizen-visible route stops (synced from driver in real-time via ntfy.sh)
- **Offline Fallback Banner** — shown when internet drops or GPS data goes stale (>60s)
- Full-screen route map (tap to expand)

### Driver Mode Screen

- Driver profile card with live GPS status pill
- Route progress bar + stop counter (e.g., "2 / 4 Stops")
- **Add Stop modal** — tap to add current GPS location as a stop, or enter custom details
- **Stops management list** — mark stops as Done, delete stops
- **Interactive driver Leaflet map** with:
  - 3-wave radar marker on driver's own position
  - Directional beam
  - Breadcrumb trail
  - "Center Vehicle" and "Add Stop" HUD buttons
- GPS broadcast controls: Start Live GPS / Simulation Mode / Pause / Stop
- Satellite status indicator (hardware GPS vs simulated)
- **Route Completion Screen** — auto-appears when ALL stops are marked Done:
  - Shows stats: stops completed, total bins collected, shift duration, km covered
  - "Share Completion Report" button (via WhatsApp / Web Share API / clipboard)
  - "End Shift and Reset Route" button

### Municipality Command Center

- Fleet overview KPI cards (trucks active, stops done, requests, SOS)
- Fleet map with animated truck positions
- Emergency SOS incident live feed with elapsed timer
- Civic request management table (filter by status)
- Municipal route management

### Community Feed Screen

- Post civic issues with photo, location, and category
- Community upvote/downvote system
- Green points leaderboard
- Civic Champion badge earning

### Services Directory

- Local certified professionals list (plumbers, electricians, etc.)
- Rating and review display
- Call-now one-tap button
- Filter by service category

### Emergency SOS

- One-tap SOS with auto-detected location
- Emergency type selector (Water Leakage, Fire, Medical, etc.)
- Direct call shortcuts: Police 112, Fire 101, Ambulance 108
- SOS transmitted to Municipality Command Center

### Civic Issue Reporter

- Report illegal dumping, broken roads, water leakage, etc.
- Photo upload capability
- GPS location auto-attach
- Status tracking (Pending -> In Progress -> Resolved)
- AI-assisted complaint description helper

### Notification System

- **Background notifications** even when app is closed (via Capacitor Local Notifications plugin)
- **Doorstep geofence alert**: triggers when truck enters 350m radius of citizen's home
- Notification settings: arrival alerts, community updates, SOS alerts
- Geofence radius configurable (default 350m)
- **Voice audio alert**: Marathi/Hindi/English announcement when truck is ~2 min away
- Chime + voice TTS via Web Speech API + pre-recorded audio files
- Notification permission request flow

### Auth System

- Login with Gmail (mock OAuth flow)
- Login with mobile number + OTP (demo OTP: 4920)
- Login with email + password
- User registration with name, mobile, area
- Role selection (Resident / Driver / Municipality)
- Profile management with logout

### Maps

- **Leaflet.js** (primary): OpenStreetMap tiles, no API key needed
- Map themes: OpenStreetMap, CartoDB Dark, CartoDB Light, Satellite (Esri)
- Citizen map: truck pin, home pin, route line, checkpoints
- Driver map: own position, breadcrumb trail, stop markers
- Full-screen route map with stop timeline panel
- Incident reporting pin on map

### Real-Time GPS System

| Feature | Detail |
|---|---|
| Cloud relay | ntfy.sh topic: `cityassist-live-gps-001` |
| Publish rate | Max every 500ms (rate-limited) |
| Subscribe method | SSE primary + WebSocket secondary + HTTP polling (1.5s fallback) |
| Cross-tab sync | BroadcastChannel API (zero latency, same device) |
| Cross-window sync | localStorage storage event listener |
| Heartbeat | Driver broadcasts every 1.5s even if GPS has not moved |
| GPS accuracy | Hardware GPS with auto-derived speed + heading from delta |
| Simulation mode | Built-in route simulator along Talegaon municipal route |

### Audio System

- Chime sound played on truck approach (Web Audio API synthesized oscillator)
- Marathi voice announcement when truck is 2 minutes away
- Multi-language TTS via Web Speech API (Marathi, Hindi, English)
- Pre-recorded audio files stored in `/audio/` folder
- Volume control, language selector, tune selector (6 different alert tunes)
- Mute/unmute toggle
- Test play button

---

## 6. JavaScript Engine Files

### `app.js` — Main Application Controller (~2700 lines)

- `CityAssist` object: routing, navigation history, toast notifications
- Screen management: `navigateTo()`, `navigateBack()`
- Modal system: `openModal()`, `closeModal()`
- Drawer navigation
- Civic request list rendering
- Address book management
- `shareRouteCompletionReport()` — via Web Share API or clipboard
- `showToast()` — bottom toast notification system

### `gps_tracker.js` — GPS and Tracking Engine (~1100 lines)

- `GPSTrackerEngine` object
- Real hardware GPS via `navigator.geolocation.watchPosition()`
- Speed and heading auto-derived from GPS deltas (Haversine + bearing formula)
- `calculateHaversineDistance()` — precise distance in km
- `calculateDistanceMeters()` — precise distance in meters
- `calculateBearing()` — heading angle from GPS deltas
- ETA calculation: `distance / max(speed, 12) * 60`
- `updateETACountdownCard()` — updates the big ETA widget with time, distance, speed, arrival time
- Stop management: `addCustomStop()`, `addCurrentLocationAsStop()`, `markStopCompleted()`, `deleteStop()`, `resetStops()`
- Route completion detection: when all stops are "completed", triggers `showRouteCompletionScreen()`
- `endShiftAndReset()` — hides overlay, resets stops, stops tracking
- Geofence trigger at 350m from citizen's home
- `broadcastAndSync()` — publishes to cloud + localStorage + BroadcastChannel

### `cloud_realtime.js` — Cloud Relay Engine (~400 lines)

- `CloudRealtime` object
- SSE stream: `https://ntfy.sh/cityassist-live-gps-001/sse`
- WebSocket: `wss://ntfy.sh/cityassist-live-gps-001/ws`
- HTTP backup poller: `https://ntfy.sh/cityassist-live-gps-001/json?poll=1&since=2m`
- Pub/Sub subscriber pattern for citizen callbacks
- `publishDriverTelemetry()` — rate-limited to max 1 per 500ms
- `publishStops()` — broadcasts stop updates to all citizen devices
- Offline monitor: `window online/offline` events + 5s periodic stale-data check
- `showOfflineBanner()` / `hideOfflineBanner()` — amber or indigo banner
- `checkDoorstepGeofenceAlert()` — runs on every incoming telemetry

### `leaflet_engine.js` — Interactive Map Engine (~800 lines)

- `LeafletMapEngine` object
- Manages 3 map instances: `citizenMap`, `driverMap`, `fullscreenMap`
- Animated truck marker: 3-wave radar pulse (CSS + Leaflet DivIcon)
- Directional beam: rotates based on `heading` from telemetry
- Breadcrumb trail: array of past positions rendered as polyline
- Smooth truck movement via `setLatLng()` with CSS transition
- Map theme switcher (4 tile providers)
- `updateTruckLocation(lat, lng, speed, heading)` — main entry point
- `refreshCheckpoints()` — re-renders driver stops as numbered map pins
- `panToVehicle()`, `panToDoorstep()`, `fitAllRoutes()`

### `notification_engine.js` — Notification Engine (~400 lines)

- `NotificationEngine` object
- Capacitor Local Notifications: schedule and trigger
- `triggerDoorstepArrivalNotification()` — fires even when app is closed
- Background permission request flow
- Notification settings: toggles for arrival, community, SOS, weekly
- `sendLocalNotification()` — generic notification sender

### `audio_announcer.js` — Audio Alert Engine (~450 lines)

- `AudioAnnouncerEngine` object
- Chime synthesizer via Web Audio API (oscillator-based)
- Voice TTS via `window.speechSynthesis`
- Pre-recorded audio file player (`/audio/` folder)
- Proximity-based trigger: 2 min alert, doorstep arrival alert
- Announcement debouncing (cooldown timer)
- Multi-language: Marathi, Hindi, English
- 6 alert tune variants

### `auth_engine.js` — Authentication Engine (~560 lines)

- `AuthEngine` object
- 3 login flows: Gmail, Mobile OTP, Email+Password
- Registration with validation
- Role-based navigation (Resident/Driver/Municipality)
- Session persistence via `localStorage`
- Demo accounts pre-loaded

### `components.js` — UI Components (~1500 lines)

- All modal content generators (notification modal, settings, scanner, etc.)
- Full-screen route map HTML generation
- Driver stop add modal
- Reward/leaderboard modals
- QR scanner UI
- Professional service cards

### `data.js` — Static Mock Data

- Civic request sample data (complaints with statuses)
- Community feed posts
- Municipal route waypoints (Talegaon fallback stops)

### `ai_engine.js` — AI Complaint Assistant

- Mock AI-powered complaint description helper
- Auto-generates complaint text from user input keywords

### `google_maps_engine.js` — Google Maps Fallback

- Alternative map engine using Google Maps (not primary, Leaflet is used)
- `updateTruckPosition()` — moves truck marker on Google Maps

---

## 7. Cloud and Realtime

### ntfy.sh Integration

**No API key required. No server setup needed.**

| Endpoint | URL |
|---|---|
| Publish (Driver) | `POST https://ntfy.sh/cityassist-live-gps-001` |
| Subscribe SSE (Citizen) | `GET https://ntfy.sh/cityassist-live-gps-001/sse` |
| WebSocket (Citizen) | `wss://ntfy.sh/cityassist-live-gps-001/ws` |
| HTTP Poll (Fallback) | `GET https://ntfy.sh/cityassist-live-gps-001/json?poll=1&since=2m` |

### Telemetry Payload Structure (Driver -> Citizen)

```json
{
  "lat": 18.728500,
  "lng": 73.676500,
  "speed": 22,
  "heading": 135,
  "accuracy": 4,
  "altitude": 560,
  "timestamp": 1724940000000,
  "status": "in_progress",
  "isHardwareGPS": true,
  "vehicleNumber": "MH-12-EA-4920",
  "driverName": "Ramesh Shinde",
  "senderDevice": "driver_app",
  "publishedAt": 1724940000000,
  "progressPct": 55
}
```

**Status values**: `not_started`, `in_progress`, `paused`, `completed`

### Stops Update Payload

```json
{
  "type": "TRUCK_STOPS_UPDATE",
  "stops": [
    {
      "id": "stop-1724940000001",
      "name": "Samta Colony Main Chowk",
      "area": "Samta Colony",
      "lat": 18.7285,
      "lng": 73.6765,
      "bins": 40,
      "status": "completed",
      "completedAt": "08:32 AM",
      "isDoorstep": false
    }
  ],
  "timestamp": 1724940000000
}
```

**Stop status values**: `pending`, `active`, `completed`

### Sync Layers (Multi-Channel Delivery)

The app uses 4 parallel sync layers to guarantee delivery:

1. **ntfy.sh Cloud** — works across the internet (different phones, different networks)
2. **BroadcastChannel API** — instant sync between tabs/windows on the same device
3. **localStorage + storage event** — cross-window sync on the same device
4. **1-second polling interval** — fallback safety net reading localStorage every second

---

## 8. Build and Deploy

### Development Workflow

```bash
# 1. Make changes to: index.html, css/style.css, js/*.js

# 2. Sync to Android
npm run sync
# This runs: node build_www.js && npx cap sync android

# 3. Build APK (from PowerShell)
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
cd android
.\gradlew.bat assembleDebug
cd ..

# 4. Copy the APK
Copy-Item android\app\build\outputs\apk\debug\app-debug.apk .\cityassist-production.apk
```

### Or via Android Studio

1. Open `android/` folder in Android Studio
2. Wait for Gradle sync to finish
3. Menu: Build -> Build Bundle(s) / APK(s) -> Build APK(s)
4. Click "Locate" to find the output APK

### npm Scripts

| Command | Action |
|---|---|
| `npm run build` | Copy source files to `www/` only |
| `npm run sync` | Build + sync to Android assets |
| `npm run open:android` | Open Android Studio (if installed) |

### Build Requirements

| Requirement | Version |
|---|---|
| Node.js | 18+ |
| npm | 9+ |
| Android Studio | Hedgehog or later |
| Java / JBR | Bundled with Android Studio |
| Android SDK | 35 (target), 22 (minimum) |
| Gradle | 8.x (auto-downloaded by wrapper) |

---

## 9. Key Configuration Files

### `capacitor.config.json`

```json
{
  "appId": "com.cityassist.app",
  "appName": "CityAssist",
  "webDir": "www"
}
```

### `manifest.json` (PWA)

```json
{
  "name": "CityAssist - Municipal Civic Services",
  "short_name": "CityAssist",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#0F7943",
  "background_color": "#0B131F"
}
```

### Android Permissions (AndroidManifest.xml)

- `ACCESS_FINE_LOCATION` — GPS tracking
- `ACCESS_COARSE_LOCATION` — Network location
- `FOREGROUND_SERVICE` — Background GPS
- `POST_NOTIFICATIONS` — Push notifications
- `RECEIVE_BOOT_COMPLETED` — Auto-start on reboot
- `INTERNET` — Cloud relay

### ntfy.sh Topic (Cloud Channel)

```
Topic: cityassist-live-gps-001
```

> [!WARNING]
> This is a public ntfy.sh topic. Anyone who knows the topic name can subscribe or publish. For production, use a **private ntfy.sh server** or add a secret auth token.

---

## 10. Known Limitations

| Limitation | Details | Workaround |
|---|---|---|
| **Public cloud topic** | ntfy.sh topic is publicly accessible | Self-host ntfy or add auth token |
| **No real backend** | No database, no server, no user accounts | All data lives in localStorage |
| **GPS accuracy indoors** | Hardware GPS may struggle indoors | Simulation mode available for testing |
| **ntfy.sh rate limits** | Free tier limits message volume | Rate-limited to 1 publish per 500ms |
| **No signed APK** | Debug APK only, not Play Store ready | Use Android Studio -> Generate Signed Bundle |
| **Map tiles need internet** | Leaflet/OSM tiles don't cache offline | Service Worker can cache tile layer |
| **Single-vehicle tracking** | Only 1 truck per topic | Add vehicle ID routing for multi-truck |
| **OTP is mock** | Demo OTP is always `4920` | Integrate real SMS OTP (Twilio/MSG91) |
| **No real AI backend** | AI complaint helper is mock | Integrate Gemini API for real AI |

---

## Quick Reference — Most Important Files

| File | What to Edit There |
|---|---|
| `index.html` | Screen layouts, HTML structure, UI elements |
| `css/style.css` | All visual styling, animations, colors |
| `js/app.js` | App navigation, business logic, toast, routing |
| `js/gps_tracker.js` | GPS, ETA, stops, route completion |
| `js/cloud_realtime.js` | Cloud relay, offline detection |
| `js/leaflet_engine.js` | Maps, radar markers, breadcrumbs |
| `js/notification_engine.js` | Background notifications |
| `js/audio_announcer.js` | Voice alerts, chime sounds |
| `js/auth_engine.js` | Login, roles, user session |
| `js/components.js` | Modal popups, UI component generators |
| `js/data.js` | Mock data for civic requests, community posts |
| `android/...AndroidManifest.xml` | Android permissions, app metadata |

---

*Documentation generated for CityAssist v1.0.0 — Talegaon Dabhade Municipal App*
