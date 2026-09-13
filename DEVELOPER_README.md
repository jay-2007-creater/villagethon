# CityAssist — Complete Developer Documentation

> **Smart Municipal Civic Services App** for Talegaon Dabhade Municipal Council (TDMC), Maharashtra, India
> Built as a hybrid mobile app (Web + Android Native) with Capacitor.js and Live Firebase Backend

---

## Table of Contents

1. [App Overview](#1-app-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Architecture](#4-architecture)
5. [All Features](#5-all-features)
6. [JavaScript Engine Files](#6-javascript-engine-files)
7. [Firebase Backend & Live Telemetry](#7-firebase-backend--live-telemetry)
8. [Area-Isolated Multi-Vehicle Fleet Tracking](#8-area-isolated-multi-vehicle-fleet-tracking)
9. [Build and Deploy](#9-build-and-deploy)
10. [Key Configuration Files](#10-key-configuration-files)
11. [Known Limitations & Roadmap](#11-known-limitations--roadmap)

---

## 1. App Overview

| Property | Value |
|---|---|
| **App Name** | CityAssist (Talegaon Dabhade Municipal Council) |
| **App ID** | `com.cityassist.app` |
| **Version** | 1.2.0 |
| **Target City** | Talegaon Dabhade, Pune District, Maharashtra, India |
| **Target Users** | Citizens / Residents, Sanitation Drivers, TDMC Municipal Officers |
| **Platform** | Android APK (+ PWA capable, Web SPA) |
| **Language** | English (UI) / Marathi (Audio Announcements & Municipal Notices) |
| **Backend** | Google Firebase (Cloud Firestore + Realtime Database) + ntfy.sh Cloud Relay |
| **APK Size** | ~20.4 MB (Debug Android Package) |

---

## 2. Tech Stack

### Frontend (Web Layer)

| Technology | Version | Purpose |
|---|---|---|
| **HTML5** | — | App UI structure (Single Page App `index.html`, ~3000 lines) |
| **Vanilla CSS** | — | Modular styling, animations, glassmorphic HUD (`css/style.css`, ~6600 lines) |
| **Vanilla JavaScript** | ES6+ | Modular engine architecture (zero bulky JS frameworks) |
| **Google Fonts** | Plus Jakarta Sans | High-legibility typography across mobile viewports |
| **Leaflet.js** | 1.9.4 | High-performance interactive GPS radar map for citizens and drivers |
| **OpenStreetMap & Google Tiles** | — | Multi-theme GIS map layers (Google Streets, Traffic, Sat, OSM) |

### Mobile App Wrapper

| Technology | Version | Purpose |
|---|---|---|
| **Capacitor.js** | 8.5.0 | Wraps web app into native Android APK |
| **@capacitor/android** | 8.5.0 | Android native bridge layer |
| **@capacitor/local-notifications** | 8.3.1 | Native doorstep arrival & background push notifications |

### Android Native Layer

| Technology | Version | Purpose |
|---|---|---|
| **Android SDK** | min SDK 22 / target 35 | Native Android runtime |
| **Kotlin / Java** | Kotlin 1.9+ / JBR 17+ | Native build toolchain |
| **Gradle** | 8.x / 9.x | Android build system |

### Cloud, Backend & Telemetry

| Technology | Purpose |
|---|---|
| **Google Cloud Firestore** | Live database for citizen grievances, advisories, triage status, and squad assignments |
| **Firebase Realtime DB / Firestore** | Live vehicle telemetry (`fleet_telemetry/{vehicleId}`) with sub-second sync |
| **ntfy.sh** | Free open-source pub/sub cloud relay for fallback live GPS telemetry |
| **BroadcastChannel API** | Zero-latency cross-tab/window synchronization |
| **Offline Persistence** | Firestore indexed DB persistence + local storage fallback for poor connectivity |

---

## 3. Project Structure

```
cityassist-app/
|
|-- index.html                    <-- MAIN SOURCE: Complete App UI (all screens & modals)
|
|-- css/
|   +-- style.css                 <-- MAIN SOURCE: Design system, theme tokens, animations
|
|-- js/
|   |-- app.js                    <-- App controller, routing, UI navigation, toast system
|   |-- firebase_service.js       <-- Live Firebase backend: grievances, advisories, fleet
|   |-- gps_tracker.js            <-- GPS engine: hardware GPS, area-filtering, ETA, stops
|   |-- leaflet_engine.js         <-- Interactive map: radar, breadcrumbs, directional beams
|   |-- cloud_realtime.js         <-- ntfy.sh cloud relay & fallback offline detection
|   |-- notification_engine.js    <-- Local notifications & doorstep geofence alerts
|   |-- audio_announcer.js        <-- Marathi/Hindi/English chime + voice alerts
|   |-- auth_engine.js            <-- Citizen, Driver, and Municipality login & session
|   |-- components.js             <-- Reusable UI modals, sheets, and full-screen viewers
|   |-- data.js                   <-- Fleet directory (GCV-001..006), wards, routes, mock data
|   |-- ai_engine.js              <-- AI grievance categorization & triage helper
|   +-- google_maps_engine.js     <-- GIS map integration fallback
|
|-- audio/                        <-- Pre-recorded Marathi arrival alert audio files
|-- manifest.json                 <-- PWA Web App Manifest
|-- sw.js                         <-- Service Worker (offline cache + background sync)
|-- capacitor.config.json         <-- Capacitor mobile configuration
|-- package.json                  <-- Project metadata & build scripts
|-- build_www.js                  <-- Sync script: prepares and syncs source to www/
|-- cityassist-production.apk     <-- Ready-to-install compiled Android APK (20.4 MB)
|
|-- www/                          <-- AUTO-GENERATED (build artifact for Android)
|   +-- [synced copy of index.html, css/, js/, audio/]
|
+-- android/                      <-- Android Studio native project
    |-- app/
    |   |-- src/main/
    |   |   |-- AndroidManifest.xml    <-- Permissions & native intents
    |   |   |-- assets/public/         <-- Web assets bundled in APK
    |   |   +-- res/                   <-- App icons and splash drawables
    |   +-- build.gradle               <-- Android app build settings
    +-- build.gradle                   <-- Root project gradle file
```

---

## 4. Architecture

### Bi-Directional Real-Time Data Flow

```
+-----------------------------------------------------------------------------------+
|                              DRIVER PHONE (Driver Mode)                           |
|  - Real Hardware GPS (watchPosition) or Municipal Route Simulation               |
|  - Anchored to Permanent Vehicle ID (e.g., GCV-002)                               |
|  - Driver can switch/claim vehicles (GCV-001 to GCV-006)                          |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
            +─────────────────────────────────────────────────────────+
            |  Firebase Service (fleet_telemetry/{vehicleId})         |
            |  + ntfy.sh Topic Fallback (cityassist-live-gps-001)     |
            +─────────────────────────────────────────────────────────+
                     │                                       │
                     │ (Filtered by citizen's Ward ID)       │ (Unfiltered all-fleet view)
                     ▼                                       ▼
+------------------------------------------+   +------------------------------------+
|         CITIZEN'S PHONE (Ward 2)         |   |    TDMC MUNICIPALITY COMMAND       |
|  - Shows ONLY assigned vehicle (GCV-002) |   |  - Full 6-Vehicle Fleet Overview   |
|  - Live ETA countdown & doorstep radar   |   |  - Live Grievance Triage Queue     |
|  - If vehicle inactive: Standby Banner   |   |  - Squad Assignment & Dispatches   |
|  - Audio Chime & Marathi Voice Alert     |   |  - Official Notice Broadcasts      |
+------------------------------------------+   +------------------------------------+
```

---

## 5. All Features

### 1. Citizen Experience
* **Home Dashboard**: Today's collection status, live proximity badge, quick actions (Report, Track, SOS, Community), notification center.
* **Area-Isolated Garbage Tracking**:
  * Shows **ONLY** the vehicle assigned to the citizen's ward (e.g. `GCV-002` for Ward 2).
  * **Live ETA Countdown Card**: Minutes, distance, speed, and expected arrival timestamp.
  * **Standby Inactive Banner**: If vehicle is not currently running in citizen's ward, clearly shows:
    > *"Garbage vehicle is currently not active in your area."*
    > *Assigned: GCV-002 • Ward 2 - Shivaji Nagar (Shift: 07:00 AM – 12:00 PM)*
  * **Interactive Radar Map**: Pulsing truck pin, directional beam, breadcrumbs, doorstep pin, Google/OSM theme switcher.
  * **Arrival Chime & Voice Alert**: Plays "Swachh Bharat" arrival tune and Marathi voice alert at 2-min ETA.
* **Grievance Reporting & Tracking**:
  * Photo attachment, GPS auto-location, AI issue categorization.
  * Live status sync (`Under Review` ➔ `Squad Dispatched` ➔ `Resolved`).
* **Community Feed**: Civic posts, upvoting, leaderboard, and green points.
* **Emergency SOS**: 1-tap emergency broadcasts with auto-location to TDMC Command.

### 2. Driver Experience
* **Permanent Vehicle Assignment**:
  * Telemetry is anchored to **Vehicle ID**, not permanently to a specific driver.
  * Substitute drivers seamlessly continue tracking the same vehicle.
* **Vehicle Switcher Modal**:
  * Driver can tap **Change ⇄** to switch between `GCV-001` (Ward 1) through `GCV-006` (Ward 6).
* **Live Route HUD**: Stop counter, route progress bar, speed readout, and interactive navigation map.
* **Stop Management**: Tap to add current GPS spot as a stop, mark stops done, or delete checkpoints.
* **Route Completion Screen**: Auto-appears when all stops are finished with shift summary, km covered, and WhatsApp report export.

### 3. Municipality Command Center
* **Live Fleet Management**: Real-time overview of all 6 authorized municipal vehicles across all wards.
* **Live Grievance Triage Queue**: Real-time Firestore sync of citizen issues. Municipal officers can assign squads (e.g., *Talegaon Pothole & Road Repair Flying Squad #1*) and update SLA statuses.
* **Publish Citizen Advisory**: Official notices and storm/water alerts pushed instantly to citizen devices.
* **Ward Performance Index**: Ward-by-ward cleanliness score and SLA compliance ratings.

---

## 6. JavaScript Engine Files

| File | Purpose | Lines |
|---|---|---|
| [`firestore.rules`](file:///C:/Users/Asus/.gemini/antigravity-ide/scratch/cityassist-app/firestore.rules) | Production security policy for Cloud Firestore collections (`grievances`, `advisories`, `vehicles`) | ~50 |
| [`database.rules.json`](file:///C:/Users/Asus/.gemini/antigravity-ide/scratch/cityassist-app/database.rules.json) | Production authorization rules for Firebase Realtime Database telemetry paths | ~20 |
| [`storage.rules`](file:///C:/Users/Asus/.gemini/antigravity-ide/scratch/cityassist-app/storage.rules) | Production security rules for grievance photo uploads (size & MIME type checks) | ~20 |
| [`js/firebase_service.js`](file:///C:/Users/Asus/.gemini/antigravity-ide/scratch/cityassist-app/js/firebase_service.js) | Cloud Firestore & Realtime DB: grievances, advisories, fleet telemetry, RBAC guards, PII masking | ~500 |
| [`js/gps_tracker.js`](file:///C:/Users/Asus/.gemini/antigravity-ide/scratch/cityassist-app/js/gps_tracker.js) | GPS tracking engine: hardware GPS, area-filtering, ETA calculations, vehicle switching | ~1500 |
| [`js/leaflet_engine.js`](file:///C:/Users/Asus/.gemini/antigravity-ide/scratch/cityassist-app/js/leaflet_engine.js) | Interactive radar maps: animated truck markers, heading beams, breadcrumbs, theme chips | ~850 |
| [`js/data.js`](file:///C:/Users/Asus/.gemini/antigravity-ide/scratch/cityassist-app/js/data.js) | Fleet vehicle directory (`GCV-001`..`006`), ward mappings, routes, shift schedules | ~350 |
| [`js/app.js`](file:///C:/Users/Asus/.gemini/antigravity-ide/scratch/cityassist-app/js/app.js) | Application controller, screen routing, RBAC screen guards, HTML sanitization, toast system | ~2800 |
| [`js/audio_announcer.js`](file:///C:/Users/Asus/.gemini/antigravity-ide/scratch/cityassist-app/js/audio_announcer.js) | Web Audio synthesizer, TTS announcements, and Marathi arrival voice player | ~450 |
| [`js/notification_engine.js`](file:///C:/Users/Asus/.gemini/antigravity-ide/scratch/cityassist-app/js/notification_engine.js) | Capacitor native local notifications and doorstep geofence trigger | ~400 |
| [`js/auth_engine.js`](file:///C:/Users/Asus/.gemini/antigravity-ide/scratch/cityassist-app/js/auth_engine.js) | Multi-role authentication (Resident, Driver, Municipality Officer), session management, RBAC | ~580 |
| [`js/components.js`](file:///C:/Users/Asus/.gemini/antigravity-ide/scratch/cityassist-app/js/components.js) | Modal popups, full-screen route maps, XSS-safe component renderers | ~1500 |

---

## 7. Firebase Backend & Live Telemetry

### Firestore Collections

1. **`grievances`**:
   ```typescript
   {
     id: string;              // e.g. "REQ-11738"
     category: string;        // e.g. "Potholes / Bad Road"
     description: string;
     lat: number;
     lng: number;
     address: string;
     ward: string;
     status: "Under Review" | "Squad Dispatched" | "Resolved";
     assignedSquad?: string;  // e.g. "Talegaon Pothole Flying Squad #1"
     createdAt: timestamp;
     updatedAt: timestamp;
   }
   ```

2. **`advisories`**:
   ```typescript
   {
     id: string;
     title: string;
     body: string;
     category: "Water Supply" | "Road Work" | "Health" | "Emergency";
     targetWard: string;      // "All Wards" or specific Ward ID
     publishedAt: timestamp;
   }
   ```

3. **`fleet_telemetry/{vehicleId}`**:
   ```typescript
   {
     vehicleId: string;       // e.g. "GCV-002"
     licensePlate: string;    // e.g. "MH-12-EA-4920"
     wardId: number;          // 2
     wardName: string;        // "Ward 2 (Samta Colony & Shivaji Nagar)"
     routeId: string;         // "RT-02"
     lat: number;
     lng: number;
     speed: number;
     heading: number;
     progressPct: number;
     status: "not_started" | "in_progress" | "paused" | "completed";
     timestamp: number;
   }
   ```

---

## 8. Area-Isolated Multi-Vehicle Fleet Tracking

### Fleet Vehicles Directory

| Vehicle ID | Ward ID | Ward Name | Route ID | Shift Schedule | License Plate | Type |
|---|---|---|---|---|---|---|
| **GCV-001** | Ward 1 | Talegaon Station & Gaothan | Route 1A | 06:30 AM – 11:30 AM | MH-14-GH-1120 | Tipper Hydraulic |
| **GCV-002** | Ward 2 | Samta Colony & Shivaji Nagar | Route 4B | 07:00 AM – 12:00 PM | MH-12-EA-4920 | Heavy Compactor |
| **GCV-003** | Ward 3 | Indrayani & Jijamata Chowk | Route 3A | 07:30 AM – 12:30 PM | MH-14-BT-5531 | Mini Tipper |
| **GCV-004** | Ward 4 | General Hospital & Lake Zone | Route 2C | 06:45 AM – 11:45 AM | MH-12-CD-7890 | Heavy Compactor |
| **GCV-005** | Ward 5 | MIDC Industrial & Lake View | Route 5A | 07:00 AM – 01:00 PM | MH-14-KL-3412 | Heavy Dumper |
| **GCV-006** | Ward 6 | Dabhade Heritage & Subhash Rd | Route 6B | 06:30 AM – 12:00 PM | MH-12-PQ-9081 | Tipper Hydraulic |

### Privacy-First GPS & Location Handling Principles
1. **Zero Unnecessary Citizen GPS Storage**:
   - The app **never stores, logs, or transmits citizen GPS history trails or breadcrumbs** to any cloud server or database.
   - Citizen location is retained strictly on-device in memory / local storage for dynamic Haversine distance and ETA calculations.
   - Precise citizen location is accessed strictly on-demand (e.g. tapping "Locate My House" or attaching a geotag to a citizen grievance).
2. **Citizen Vehicle Information Masking**:
   - Internal vehicle identifiers (e.g. `GCV-002`), internal engine/chassis specs, license plates, and driver personal contact numbers are hidden from citizen views.
   - Citizens receive friendly civic status: `"Collection Van • Ward 2 (Samta Colony)"`, ETA, and doorstep arrival alerts.
3. **Operational Access for Municipality**:
   - Municipal Officers have access to full operational fleet records, license plates, live speed, driver contact details, fuel status, and triage squad telemetry in the Municipal Command Center.
4. **Driver Location Access**:
   - Drivers broadcast GPS telemetry strictly while actively on duty on their municipality-assigned route.

---

## 9. Build and Deploy

### 1. Build and Sync Web Assets
```powershell
# Sync root source code into www/ and Android assets
node build_www.js
```

### 2. Compile Android Debug APK
```powershell
# Set Java runtime to Android Studio JBR
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

# Run Gradle build
cd android
.\gradlew.bat assembleDebug
cd ..

# Copy APK to root directory
Copy-Item android\app\build\outputs\apk\debug\app-debug.apk .\cityassist-production.apk -Force
```

---

## 10. Key Configuration Files

* **`js/config.js`**: Centralized production environment configuration (`ENV: 'production'`, `IS_PRODUCTION: true`), frozen at runtime, containing only public client Web SDK parameters with zero embedded server secrets.
* **`capacitor.config.json`**: App ID `com.cityassist.app`, web directory `www`.
* **`android/app/src/main/AndroidManifest.xml`**: Hardware GPS permissions (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`), push notifications (`POST_NOTIFICATIONS`), foreground services (`FOREGROUND_SERVICE`), and internet access.
* **`manifest.json`**: PWA metadata with standalone display mode and theme color `#0F7943`.
* **`firestore.rules` & `database.rules.json`**: Role-based access control, immutable audit logging, and vehicle isolation rules.

---

## 11. Production Authentication & Security Architecture

| Security Domain | Implementation | Security Control |
|---|---|---|
| **Citizen Authentication** | Firebase Phone Auth (SMS) / Firebase Email-Password / Google Sign-In | Cryptographically verified OTP, reCAPTCHA Enterprise, No demo bypasses |
| **Driver & Officer Authorization** | Municipality-Approved Staff Registry (`staff_registry` collection) | Strict RBAC: No self-assignment of staff roles. Unapproved signups default strictly to `citizen` |
| **Municipal Verification Flow** | Two-Phase Account Verification (`pending` ➔ `approved`) | Non-approved staff signups are placed in `pending` status. Only authorized TDMC Admins can approve or reject staff |
| **Granular RBAC Permissions** | Role-Based Access Control (`AuthEngine.hasPermission`) | Explicit permission scopes (`staff_admin`, `fleet_manage`, `publish_advisories`, `triage_grievances`, `driver_telemetry`) |
| **Firebase App Check** | Google Play Integrity (Android) & reCAPTCHA v3 (Web) + Debug Provider | Attests authentic app binaries and protects Cloud Firestore & Realtime Database from API abuse, scraping, and replay attacks |
| **Firestore Security Rules** | `firestore.rules` (v2) | Privilege escalation prevention on `users/{uid}`, role-gated access to `staff_registry`, `grievances`, `vehicles` |
| **Realtime Database Security** | `database.rules.json` | Root `.read` restricted to officers, `$vehicleId` writes locked to assigned driver |
| **Administrative Audit Logging** | Cloud Firestore (`audit_logs/{logId}`) & RTDB (`/audit_logs`) | Immutable, tamper-proof logs of administrative actions. Accessible strictly to authorized administrators with zero logging of credentials/PII |
| **Production Signing** | Android APK compiled (`cityassist-production.apk`) | Ready for Release Signing / Google Play Internal App Sharing |

### Municipal Account Verification & RBAC Details
1. **Self-Escalation Prevention**:
   - When a user signs up or logs in selecting "Municipal Officer" or "Driver", the system queries `staff_registry`.
   - If the user's phone or email is not in `staff_registry` or has `status: 'pending'`, they are **never given officer/admin privileges**.
   - Their session is established with `role: 'citizen'` and `staffStatus: 'pending'`.
2. **Administrator Approval Workflow**:
   - Only authenticated users with `staff_admin` permission (TDMC Chief Administrators) can approve or reject accounts via the **Staff Verification & RBAC** management dashboard (`openStaffManagementModal()`).
   - On approval, the administrator assigns specific role permissions (`triage_grievances`, `publish_advisories`, `fleet_manage`, etc.) and the record is persisted to Cloud Firestore (`staff_registry/{staffId}`).
3. **Granular Feature Gating**:
   - Advisory Broadcasts: Gated by `publish_advisories` permission.
   - Grievance Squad Dispatch: Gated by `triage_grievances` permission.
   - Fleet & Route Reassignment: Gated by `fleet_manage` permission.
   - Staff Approval / Role Assignment: Gated strictly by `staff_admin` permission.
   - Driver GPS Telemetry: Gated strictly by `driver_telemetry` permission on the driver's assigned vehicle.

### Secure Administrative Audit Logging
1. **Logged Action Types**:
   - `VEHICLE_ASSIGNMENT_CHANGED`: Garbage vehicle route, ward, or driver reassignment.
   - `COMPLAINT_STATUS_CHANGED`: Grievance status transitions (pending ➔ assigned ➔ in_progress ➔ resolved).
   - `COMPLAINT_SQUAD_ASSIGNED`: Dispatch of municipal squads to citizen complaints.
   - `ADVISORY_BROADCASTED`: Official municipal advisory and citizen broadcast notices.
   - `STAFF_ACCOUNT_APPROVED`: Approval of municipal officer or driver credentials.
   - `STAFF_ACCOUNT_REJECTED`: Rejection or revocation of municipal staff accounts.
2. **Log Schema & Storage**:
   - **Stored Fields**: `id`, `userId`, `userName`, `userRole`, `action`, `recordId`, `targetType`, `details`, `timestamp`, `createdAt`.
   - **Zero PII / Credential Storage**: Passwords, OTPs, PINs, tokens, and citizen private phone numbers are strictly stripped prior to persistence.
3. **Immutability & Access Control**:
   - Enforced by `firestore.rules` and `database.rules.json`: Audit log collections are **append-only** (`allow create: if isOfficer()`), with update and delete actions blocked permanently (`allow update, delete: if false`).
   - Audit logs are accessible strictly to authorized municipal administrators via `openAuditLogsModal()`.

---

*CityAssist Documentation — Talegaon Dabhade Municipal Council (TDMC) Production Edition*


