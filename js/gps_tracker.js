/**
 * Real Hardware GPS Tracking & Telemetry Engine for CityAssist
 * Manages Driver Mode GPS Broadcasting, Cross-Tab/Storage Real-Time Sync,
 * Citizen Doorstep Tracking, Haversine Distance & Dynamic ETA Calculations.
 */

const GPSTrackerEngine = {
  // 1. Citizen Location (Separate from Driver Location)
  citizenLocation: {
    lat: 18.7285,
    lng: 73.6765,
    name: "Samta Colony, Talegaon Dabhade",
    accuracy: 5
  },

  // 2. Driver/Vehicle Live Telemetry (Updated continuously in Driver Mode)
  driverTelemetry: {
    lat: 18.7340,
    lng: 73.6700,
    speed: 0,
    heading: 135,
    accuracy: 4,
    altitude: 560,
    status: 'not_started', // 'not_started' | 'in_progress' | 'paused' | 'completed'
    timestamp: Date.now(),
    isHardwareGPS: false,
    vehicleNumber: "MH-12-EA-4920",
    driverName: "Ramesh Shinde",
    routeId: "Route 2A",
    progressPct: 0
  },

  // Dynamic Driver Route Stops (Added and managed by driver in Driver Mode)
  driverCustomStops: [
    {
      id: "stop-1",
      name: "Talegaon Station Road (Start)",
      area: "Talegaon Station North",
      lat: 18.7340,
      lng: 73.6700,
      bins: 45,
      status: "completed",
      completedAt: "08:15 AM",
      isDoorstep: false
    },
    {
      id: "stop-2",
      name: "Maratha Colony Residential Area",
      area: "Maratha Colony",
      lat: 18.7315,
      lng: 73.6730,
      bins: 38,
      status: "completed",
      completedAt: "08:30 AM",
      isDoorstep: false
    },
    {
      id: "stop-3",
      name: "Samta Colony (Your Doorstep Zone)",
      area: "Samta Colony",
      lat: 18.7285,
      lng: 73.6765,
      bins: 50,
      status: "active",
      completedAt: null,
      isDoorstep: true
    },
    {
      id: "stop-4",
      name: "Talegaon Waste Processing Depot (End)",
      area: "Depot Sector 4",
      lat: 18.7210,
      lng: 73.6845,
      bins: 0,
      status: "pending",
      completedAt: null,
      isDoorstep: false
    }
  ],

  // Pre-mapped high-precision municipal route waypoints for fallback
  get municipalRouteWaypoints() {
    if (this.driverCustomStops && this.driverCustomStops.length > 0) {
      return this.driverCustomStops.map((s, idx) => ({
        lat: s.lat,
        lng: s.lng,
        pct: Math.round((idx / Math.max(1, this.driverCustomStops.length - 1)) * 100),
        speed: 20,
        stopIdx: idx,
        label: s.name,
        status: s.status
      }));
    }
    return [
      { lat: 18.7340, lng: 73.6700, pct: 0, speed: 20, stopIdx: 0, label: "Talegaon Station Road (Start)" },
      { lat: 18.7285, lng: 73.6765, pct: 50, speed: 18, stopIdx: 1, label: "Samta Colony (Doorstep)" },
      { lat: 18.7210, lng: 73.6845, pct: 100, speed: 0, stopIdx: 2, label: "Talegaon Depot (End)" }
    ];
  },

  watchId: null,
  broadcastChannel: null,
  simInterval: null,
  simProgress: 0,
  syncInterval: null,

  init() {
    // 0. Restore driver custom stops if saved
    const savedStops = localStorage.getItem('cityassist_driver_stops');
    if (savedStops) {
      try {
        const parsed = JSON.parse(savedStops);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.driverCustomStops = parsed;
        }
      } catch (e) {}
    }

    // 1. Restore citizen location if saved
    const savedCitizen = localStorage.getItem('cityassist_citizen_location');
    if (savedCitizen) {
      try {
        const parsed = JSON.parse(savedCitizen);
        if (parsed.lat && parsed.lng) {
          this.citizenLocation = { ...this.citizenLocation, ...parsed };
        }
      } catch (e) {}
    }

    // 2. Setup cross-tab BroadcastChannel for zero-latency sync
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('cityassist_live_gps');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'DRIVER_GPS_UPDATE') {
            this.handleIncomingDriverTelemetry(event.data.telemetry);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }
    }

    // 3. Listen to window storage event for cross-window real-time synchronization
    window.addEventListener('storage', (e) => {
      if (e.key === 'cityassist_driver_gps' && e.newValue) {
        try {
          const telemetry = JSON.parse(e.newValue);
          this.handleIncomingDriverTelemetry(telemetry);
        } catch (err) {}
      }
      if (e.key === 'cityassist_citizen_location' && e.newValue) {
        try {
          const citizen = JSON.parse(e.newValue);
          this.citizenLocation = citizen;
          this.handleIncomingDriverTelemetry(this.driverTelemetry);
        } catch (err) {}
      }
    });

    // 4. Restore last known driver telemetry
    const savedTelemetry = localStorage.getItem('cityassist_driver_gps');
    if (savedTelemetry) {
      try {
        const parsed = JSON.parse(savedTelemetry);
        this.handleIncomingDriverTelemetry(parsed);
      } catch (e) {}
    }

    // 5. Active 1-second Polling interval to guarantee live synchronization across all views
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => {
      const live = localStorage.getItem('cityassist_driver_gps');
      if (live) {
        try {
          const parsed = JSON.parse(live);
          if (parsed && parsed.timestamp !== this.driverTelemetry.timestamp) {
            this.handleIncomingDriverTelemetry(parsed);
          }
        } catch (e) {}
      }
    }, 1000);

    // 6. Subscribe to Cloud Realtime (Supabase / Firebase)
    if (typeof CloudRealtime !== 'undefined') {
      CloudRealtime.subscribeToTruck((cloudTelemetry) => {
        if (cloudTelemetry && cloudTelemetry.lat && cloudTelemetry.lng) {
          this.handleIncomingDriverTelemetry(cloudTelemetry);
        }
      });
    }

    // 7. Auto-detect citizen real doorstep GPS ONLY if no location exists
    const hasExistingLoc = localStorage.getItem('cityassist_citizen_location') || (typeof CityData !== 'undefined' && CityData.addresses && CityData.addresses.some(a => a.isDefault && a.lat));
    if (!hasExistingLoc) {
      setTimeout(() => {
        this.fetchCitizenLocation(
          (loc) => console.log("Citizen GPS Location synchronized:", loc.lat, loc.lng),
          (err) => console.log("Using cached citizen location")
        );
      }, 800);
    }
  },

  /**
   * Set and switch Citizen's Doorstep Location
   */
  setCitizenLocation(lat, lng, name = "My Home", address = "") {
    if (!lat || !lng) return;
    this.citizenLocation = {
      lat: Number(Number(lat).toFixed(6)),
      lng: Number(Number(lng).toFixed(6)),
      name: name,
      address: address || name,
      accuracy: 5
    };
    localStorage.setItem('cityassist_citizen_location', JSON.stringify(this.citizenLocation));

    // Update Leaflet map marker
    if (typeof LeafletMapEngine !== 'undefined' && LeafletMapEngine.updateCitizenLocation) {
      LeafletMapEngine.updateCitizenLocation(this.citizenLocation.lat, this.citizenLocation.lng, name, address);
    }

    // Broadcast across browser tabs
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'CITIZEN_LOCATION_UPDATE',
          citizen: this.citizenLocation
        });
      } catch (e) {}
    }

    // Re-evaluate distance, ETA and UI metrics with new location
    this.handleIncomingDriverTelemetry(this.driverTelemetry);
  },

  /**
   * Fetch Citizen's Real-time Hardware GPS Location
   */
  fetchCitizenLocation(onSuccess, onError) {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.citizenLocation = {
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
            name: "Current GPS Location",
            accuracy: Math.round(pos.coords.accuracy || 5)
          };
          localStorage.setItem('cityassist_citizen_location', JSON.stringify(this.citizenLocation));
          if (typeof LeafletMapEngine !== 'undefined' && LeafletMapEngine.updateCitizenLocation) {
            LeafletMapEngine.updateCitizenLocation(this.citizenLocation.lat, this.citizenLocation.lng, "Current GPS Location", "");
          }
          this.handleIncomingDriverTelemetry(this.driverTelemetry);
          if (onSuccess) onSuccess(this.citizenLocation);
        },
        (err) => {
          console.warn("Citizen geolocation warning:", err.message);
          if (onError) onError(err);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
      );
    } else if (onError) {
      onError(new Error("Geolocation not supported"));
    }
  },

  /**
   * Driver Mode & Citizen Demo: Start Live GPS Broadcasting
   * @param {'hardware' | 'simulation'} mode - Tracking mode (defaults to 'hardware')
   */
  startLiveTracking(mode = 'hardware') {
    this.driverTelemetry.status = 'in_progress';
    this.trackingMode = mode;

    if (typeof AudioAnnouncerEngine !== 'undefined') {
      AudioAnnouncerEngine.isEnabled = true;
      AudioAnnouncerEngine.unlockAudio();
      AudioAnnouncerEngine.resetAnnouncements();
    }

    // Clear any previous simulation
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }

    if (mode === 'simulation') {
      // 1. Backup original driver stops before injecting demo address
      if (!this.originalStopsBackup) {
        this.originalStopsBackup = JSON.parse(JSON.stringify(this.driverCustomStops));
      }

      // 2. Inject citizen's active doorstep address right into the demo route path!
      const citizen = this.citizenLocation || { lat: 18.7285, lng: 73.6765, name: "Samta Colony" };
      const citizenName = citizen.name || "Your Active Doorstep 🏠";
      const citizenArea = citizen.address ? citizen.address.split(',')[0] : (citizenName.split(',')[0] || "Your Doorstep");

      this.driverCustomStops = [
        {
          id: "demo-stop-1",
          name: "Talegaon Station Road (Start)",
          area: "Station North Ward",
          lat: Number((citizen.lat + 0.0075).toFixed(6)),
          lng: Number((citizen.lng - 0.0070).toFixed(6)),
          bins: 40,
          status: "completed",
          completedAt: "08:15 AM",
          isDoorstep: false
        },
        {
          id: "demo-stop-2",
          name: "Approach Zone (600m - Alert Trigger)",
          area: "Sector Approach Road",
          lat: Number((citizen.lat + 0.0035).toFixed(6)),
          lng: Number((citizen.lng - 0.0032).toFixed(6)),
          bins: 35,
          status: "active",
          completedAt: null,
          isDoorstep: false
        },
        {
          id: "demo-stop-3",
          name: `${citizenName} (Your Doorstep Zone)`,
          area: citizenArea,
          lat: citizen.lat,
          lng: citizen.lng,
          bins: 50,
          status: "pending",
          completedAt: null,
          isDoorstep: true
        },
        {
          id: "demo-stop-4",
          name: "Indrayani Lake Promenade",
          area: "Indrayani Ward",
          lat: Number((citizen.lat - 0.0040).toFixed(6)),
          lng: Number((citizen.lng + 0.0042).toFixed(6)),
          bins: 30,
          status: "pending",
          completedAt: null,
          isDoorstep: false
        },
        {
          id: "demo-stop-5",
          name: "Talegaon Waste Processing Depot (End)",
          area: "Depot Sector 4",
          lat: Number((citizen.lat - 0.0080).toFixed(6)),
          lng: Number((citizen.lng + 0.0082).toFixed(6)),
          bins: 0,
          status: "pending",
          completedAt: null,
          isDoorstep: false
        }
      ];

      this.demoActive = true;
      this.simProgress = 0;
      this.renderCitizenStopsUI();
      this.renderDriverStopsUI();

      if (typeof LeafletMapEngine !== 'undefined') {
        LeafletMapEngine.renderDynamicRouteStopsOnMap();
        LeafletMapEngine.fitCitizenView();
      }

      // Show Live Demo Banner on UI
      const demoBanner = document.getElementById('citizen-demo-banner');
      if (demoBanner) demoBanner.style.display = 'flex';

      this.broadcastAndSync(this.driverTelemetry);
      this.startActiveMovementBroadcaster();
      return;
    }

    // --- REAL HARDWARE DEVICE GPS MODE ---
    if ("wakeLock" in navigator) {
      try {
        navigator.wakeLock.request('screen').then(lock => {
          this.wakeLock = lock;
          console.log("✓ Screen WakeLock acquired for live GPS broadcasting");
        }).catch(() => {});
      } catch (e) {}
    }

    if ("geolocation" in navigator) {
      // Immediate one-shot position fix
      navigator.geolocation.getCurrentPosition(
        (pos) => this.onHardwareGPSReceived(pos),
        (err) => {
          console.warn("Initial hardware GPS fix warning:", err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      // Continuous real hardware GPS watcher
      if (this.watchId !== null) {
        navigator.geolocation.clearWatch(this.watchId);
      }
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => this.onHardwareGPSReceived(pos),
        (err) => {
          console.warn("Hardware GPS stream warning:", err.message);
          const satStatus = document.getElementById('driver-gps-satellite-status');
          if (satStatus) {
            satStatus.innerHTML = `<span style="color:#F59E0B;">⚠️</span> Waiting for GPS Satellites...`;
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000
        }
      );

      // Heartbeat interval: Broadcasts every 1.5s to keep citizen phone active
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = setInterval(() => {
        if (this.driverTelemetry.status === 'in_progress') {
          this.broadcastAndSync({ ...this.driverTelemetry, timestamp: Date.now() });
        }
      }, 1500);
    } else {
      console.warn("Geolocation API not supported by browser/device");
    }
  },

  /**
   * On real hardware GPS position received from Driver's device
   * Dynamically calculates speed & heading if hardware sensors return null
   */
  onHardwareGPSReceived(position) {
    if (this.driverTelemetry.status !== 'in_progress') return;

    const coords = position.coords;
    const newLat = Number(coords.latitude.toFixed(6));
    const newLng = Number(coords.longitude.toFixed(6));
    const now = Date.now();

    // Derive speed and heading from delta if hardware values are null
    const prevLat = this.driverTelemetry.lat || newLat;
    const prevLng = this.driverTelemetry.lng || newLng;
    const prevTime = this.driverTelemetry.timestamp || (now - 1000);
    const timeDeltaSec = Math.max(0.5, (now - prevTime) / 1000);
    const distDeltaMeters = this.calculateDistanceMeters(prevLat, prevLng, newLat, newLng);

    let speedKmh = 0;
    if (coords.speed !== null && coords.speed !== undefined && !isNaN(coords.speed) && coords.speed > 0) {
      speedKmh = Math.round(coords.speed * 3.6);
    } else if (distDeltaMeters > 2) {
      // Calculate speed from GPS movement delta
      speedKmh = Math.min(80, Math.round((distDeltaMeters / timeDeltaSec) * 3.6));
    }

    let heading = this.driverTelemetry.heading || 0;
    if (coords.heading !== null && coords.heading !== undefined && !isNaN(coords.heading)) {
      heading = Math.round(coords.heading);
    } else if (distDeltaMeters > 3) {
      // Calculate bearing angle from delta
      heading = Math.round(this.calculateBearing(prevLat, prevLng, newLat, newLng));
    }

    this.driverTelemetry = {
      ...this.driverTelemetry,
      lat: newLat,
      lng: newLng,
      speed: speedKmh,
      heading: heading,
      accuracy: Math.round(coords.accuracy || 4),
      altitude: coords.altitude ? Math.round(coords.altitude) : 560,
      timestamp: now,
      isHardwareGPS: true,
      status: 'in_progress'
    };

    this.broadcastAndSync(this.driverTelemetry);
  },

  calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  calculateBearing(lat1, lon1, lat2, lon2) {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    return (θ * 180 / Math.PI + 360) % 360;
  },

  /**
   * Continuous movement telemetry broadcaster (Demo Simulation Mode only)
   */
  startActiveMovementBroadcaster() {
    if (this.simInterval) clearInterval(this.simInterval);

    this.simInterval = setInterval(() => {
      if (this.driverTelemetry.status !== 'in_progress') return;

      this.simProgress = (this.simProgress + 2.5);
      if (this.simProgress > 100) this.simProgress = 100;

      const waypoints = this.municipalRouteWaypoints;
      const totalSegments = waypoints.length - 1;
      const segmentProgress = (this.simProgress / 100) * totalSegments;
      const segIndex = Math.min(Math.floor(segmentProgress), totalSegments - 1);
      const subPct = segmentProgress - segIndex;

      const curr = waypoints[segIndex];
      const next = waypoints[segIndex + 1];

      const curLat = curr.lat + (next.lat - curr.lat) * subPct;
      const curLng = curr.lng + (next.lng - curr.lng) * subPct;
      const curSpeed = this.simProgress >= 98 ? 0 : (curr.speed + Math.floor(Math.sin(Date.now() / 1500) * 4));

      this.driverTelemetry = {
        ...this.driverTelemetry,
        lat: Number(curLat.toFixed(6)),
        lng: Number(curLng.toFixed(6)),
        speed: Math.max(0, curSpeed),
        heading: 135,
        accuracy: 3,
        altitude: 560,
        progressPct: Math.round(this.simProgress),
        timestamp: Date.now(),
        isHardwareGPS: false,
        status: this.simProgress >= 100 ? 'completed' : 'in_progress'
      };

      this.broadcastAndSync(this.driverTelemetry);

      if (this.simProgress >= 100) {
        clearInterval(this.simInterval);
        this.simInterval = null;
        if (this.demoActive) {
          this.cleanupDemoStops();
        }
        if (typeof CityAssist !== 'undefined') {
          CityAssist.showToast("🎉 Simulated Demo Finished & Doorstep Address Restored! Reached Sector 4 Depot.");
        }
      }
    }, 1500);
  },

  /**
   * Cleanup and remove temporary demo doorstep stop, restoring original stops list
   */
  cleanupDemoStops() {
    if (this.originalStopsBackup) {
      this.driverCustomStops = JSON.parse(JSON.stringify(this.originalStopsBackup));
      this.originalStopsBackup = null;
    }
    this.demoActive = false;
    this.renderCitizenStopsUI();
    this.renderDriverStopsUI();
    if (typeof LeafletMapEngine !== 'undefined') {
      LeafletMapEngine.renderDynamicRouteStopsOnMap();
    }
    const demoBanner = document.getElementById('citizen-demo-banner');
    if (demoBanner) demoBanner.style.display = 'none';
  },

  pauseTracking() {
    this.driverTelemetry.status = 'paused';
    this.driverTelemetry.speed = 0;
    this.broadcastAndSync(this.driverTelemetry);
  },

  resumeTracking() {
    this.driverTelemetry.status = 'in_progress';
    this.broadcastAndSync(this.driverTelemetry);
  },

  stopLiveTracking() {
    this.driverTelemetry.status = 'not_started';
    this.driverTelemetry.speed = 0;
    this.simProgress = 0;

    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }

    if (this.demoActive) {
      this.cleanupDemoStops();
    }

    this.broadcastAndSync(this.driverTelemetry);
  },

  /**
   * Broadcast telemetry across cloud, channels, storage, and update UI
   */
  broadcastAndSync(telemetry) {
    this.driverTelemetry = telemetry;

    // 1. Publish to Supabase / Firebase Cloud Realtime
    if (typeof CloudRealtime !== 'undefined') {
      try {
        CloudRealtime.publishDriverTelemetry(telemetry);
      } catch (e) {}
    }

    // 2. Broadcast to other tabs/windows
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'DRIVER_GPS_UPDATE',
          telemetry: telemetry
        });
      } catch (e) {}
    }

    // 3. Write to local database / storage
    try {
      localStorage.setItem('cityassist_driver_gps', JSON.stringify(telemetry));
    } catch (e) {}

    // 4. Update all active Citizen & Driver UI components immediately
    this.handleIncomingDriverTelemetry(telemetry);
  },

  /**
   * Haversine Distance Formula (calculates precise distance in km)
   */
  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * Synchronize incoming driver GPS telemetry with all Citizen and Driver UI components
   */
  handleIncomingDriverTelemetry(telemetry) {
    if (!telemetry || !telemetry.lat || !telemetry.lng) return;

    // Calculate real Haversine distance between vehicle and citizen
    const distanceKm = this.calculateHaversineDistance(
      telemetry.lat,
      telemetry.lng,
      this.citizenLocation.lat,
      this.citizenLocation.lng
    );

    const distanceFormatted = distanceKm < 1 
      ? `${Math.round(distanceKm * 1000)} m` 
      : `${distanceKm.toFixed(1)} km`;

    // Speed-based dynamic ETA calculation (assuming municipal collection pace ~20 km/h)
    const effectiveSpeed = Math.max(telemetry.speed || 18, 12);
    const etaMins = Math.max(1, Math.round((distanceKm / effectiveSpeed) * 60));

    // Progress percentage along route (0% to 100%)
    const pct = telemetry.progressPct !== undefined 
      ? telemetry.progressPct 
      : Math.min(100, Math.max(0, Math.round((1 - Math.min(distanceKm / 2.5, 1)) * 100)));

    // -------------------------------------------------------------
    // 1. Update Driver Dashboard Telemetry HUD (#screen-driver)
    // -------------------------------------------------------------
    const driverCoords = document.getElementById('driver-telemetry-coords');
    const driverEta = document.getElementById('driver-eta-display');
    const driverSpeed = document.getElementById('driver-live-speed');
    const driverSatPill = document.getElementById('driver-gps-satellite-status');

    if (driverCoords) {
      driverCoords.textContent = `GPS: ${telemetry.lat.toFixed(4)}° N, ${telemetry.lng.toFixed(4)}° E (±${telemetry.accuracy || 4}m)`;
    }
    if (driverEta) {
      driverEta.textContent = `${etaMins} mins (${distanceFormatted})`;
    }
    if (driverSpeed) {
      driverSpeed.textContent = `${telemetry.speed || 0} km/h`;
    }
    if (driverSatPill) {
      driverSatPill.innerHTML = telemetry.isHardwareGPS 
        ? `<span class="pulse-dot-green"></span> Hardware Satellites Locked 🛰️`
        : `<span class="pulse-dot-green"></span> Live GPS Broadcast Active 🟢`;
    }

    // Update Driver Map Truck Pin
    const driverTruckPin = document.getElementById('driver-moving-truck-pin');
    if (driverTruckPin) {
      const dX = 24 + (pct / 100) * 286;
      const dY = 72 + Math.sin((pct / 100) * Math.PI) * 20;
      driverTruckPin.setAttribute('transform', `translate(${dX}, ${dY})`);
    }

    // -------------------------------------------------------------
    // 2. Update Citizen Garbage Tracking Screen (#screen-garbage)
    // -------------------------------------------------------------
    const gtDistance = document.getElementById('gt-distance-text');
    const gtEta = document.getElementById('gt-eta-text');
    const gtFill = document.getElementById('gt-stepper-fill');
    const gtTruckMarker = document.getElementById('gt-map-truck-marker');
    const gtNoticeHeadline = document.querySelector('.gt-notice-headline');

    if (gtDistance) {
      gtDistance.textContent = distanceKm < 0.15 
        ? "Vehicle is at your doorstep!" 
        : `Vehicle is ${distanceFormatted} away`;
    }
    if (gtEta) {
      gtEta.textContent = distanceKm < 0.15 
        ? "Arrived at your doorstep!" 
        : `Expected in ${etaMins} mins`;
    }
    if (gtNoticeHeadline) {
      gtNoticeHeadline.innerHTML = distanceKm < 0.15
        ? `Garbage collector has <strong class="highlight-green-text">arrived at your doorstep.</strong>`
        : `Garbage collector will arrive in your area <strong class="highlight-green-text">within ${etaMins} mins.</strong>`;
    }

    // Stepper Stage Progress Fill & Status
    if (gtFill) {
      gtFill.style.width = `${Math.max(12, pct)}%`;
    }

    let activeStepIdx = 0;
    if (pct >= 90 || distanceKm < 0.2) activeStepIdx = 3;
    else if (pct >= 60 || distanceKm < 0.8) activeStepIdx = 2;
    else if (pct >= 30 || distanceKm < 1.5) activeStepIdx = 1;
    else activeStepIdx = 0;

    [0, 1, 2, 3].forEach(idx => {
      const step = document.getElementById(`gt-step-${idx}`);
      if (step) {
        step.className = 'gt-step-item';
        const circle = step.querySelector('.gt-step-circle');
        const label = step.querySelector('.gt-step-label');
        if (idx < activeStepIdx) {
          step.classList.add('completed');
          if (circle) circle.className = 'gt-step-circle';
          if (label) label.className = 'gt-step-label';
        } else if (idx === activeStepIdx) {
          step.classList.add('active');
          if (circle) circle.className = 'gt-step-circle solid-green';
          if (label) label.className = 'gt-step-label active-bold';
        } else {
          if (circle) circle.className = 'gt-step-circle pending-grey';
          if (label) label.className = 'gt-step-label';
        }
      }
    });

    // Move Garbage Tracking Screen Truck Marker on Map SVG
    if (gtTruckMarker) {
      // Map path: From (220, 15) along curve to Citizen Home Pin (85, 185)
      const mapX = 220 - (pct / 100) * 135;
      const mapY = 15 + (pct / 100) * 170;
      gtTruckMarker.setAttribute('transform', `translate(${mapX}, ${mapY})`);
    }

    // Move Google Maps Truck Marker
    if (typeof GoogleMapsEngine !== 'undefined') {
      GoogleMapsEngine.updateTruckPosition(telemetry.lat, telemetry.lng, telemetry.heading);
    }

    // -------------------------------------------------------------
    // 3. Update Citizen Home Screen (#screen-home) Today's Collection Widget
    // -------------------------------------------------------------
    const homeProximity = document.getElementById('home-proximity-text');
    const homeMiniTruck = document.getElementById('home-mini-truck-marker');
    if (homeProximity) {
      homeProximity.innerHTML = distanceKm < 0.15
        ? `Vehicle arrived at<br>your doorstep`
        : `Vehicle is ${distanceFormatted}<br>away (${etaMins}m)`;
    }
    if (homeMiniTruck) {
      const hX = 25 + (pct / 100) * 90;
      const hY = 78 - (pct / 100) * 45;
      homeMiniTruck.setAttribute('transform', `translate(${hX}, ${hY})`);
    }

    // -------------------------------------------------------------
    // 4. Update Municipality Command Center Fleet Map
    // -------------------------------------------------------------
    const muniTruck = document.getElementById('muni-truck-1');
    if (muniTruck) {
      const muniX = 40 + (pct / 100) * 220;
      const muniY = 48 + Math.sin((pct / 100) * Math.PI) * 35;
      muniTruck.setAttribute('transform', `translate(${muniX}, ${muniY})`);
    }

    // -------------------------------------------------------------
    // 5. Update Interactive Leaflet Map Truck Pins
    // -------------------------------------------------------------
    if (typeof LeafletMapEngine !== 'undefined') {
      LeafletMapEngine.updateTruckLocation(telemetry.lat, telemetry.lng, telemetry.speed, telemetry.heading);
    }

    // -------------------------------------------------------------
    // 6. Trigger Audio Proximity Announcer for Citizen screens only
    // -------------------------------------------------------------
    if (typeof AudioAnnouncerEngine !== 'undefined' && telemetry.status === 'in_progress') {
      const isDriverActive = (this.watchId !== null || this.driverTelemetry.status === 'in_progress');
      AudioAnnouncerEngine.onProximityUpdate(distanceKm, etaMins, telemetry.status, isDriverActive);
    }

    // -------------------------------------------------------------
    // 7. Trigger Smart Doorstep Geofence Notification (within 350m)
    // -------------------------------------------------------------
    if (distanceKm <= 0.35 && !this.geofenceTriggered && telemetry.status === 'in_progress') {
      this.geofenceTriggered = true;
      if (typeof CityAssist !== 'undefined') {
        CityAssist.triggerDoorstepGeofenceAlert(Math.round(distanceKm * 1000), etaMins);
      }
    } else if (distanceKm > 0.8) {
      this.geofenceTriggered = false;
    }

    // -------------------------------------------------------------
    // 8. Update ETA Countdown Card (Feature 1)
    // -------------------------------------------------------------
    this.updateETACountdownCard(distanceKm, etaMins, telemetry.speed || 18, pct);
  },

  /**
   * Update the prominent ETA countdown card in the Garbage Tracking screen
   */
  updateETACountdownCard(distanceKm, etaMins, speed, pct) {
    const etaBigNum = document.getElementById('eta-big-number');
    const etaDistNum = document.getElementById('eta-distance-number');
    const etaDistUnit = document.getElementById('eta-distance-unit');
    const etaSpeedText = document.getElementById('eta-speed-text');
    const etaArrivesAt = document.getElementById('eta-arrives-at-text');
    const etaRoutePct = document.getElementById('eta-route-pct-text');
    const etaRouteFill = document.getElementById('eta-route-progress-fill');

    if (distanceKm < 0.1) {
      if (etaBigNum) etaBigNum.textContent = '0';
      if (etaDistNum) etaDistNum.textContent = `${Math.round(distanceKm * 1000)}`;
      if (etaDistUnit) etaDistUnit.textContent = 'M AWAY';
      if (etaArrivesAt) etaArrivesAt.textContent = '🏠 Arrived at your doorstep!';
      if (etaSpeedText) etaSpeedText.textContent = 'Collection in progress';
    } else {
      if (etaBigNum) etaBigNum.textContent = etaMins;
      const distFormatted = distanceKm < 1 ? Math.round(distanceKm * 1000) : distanceKm.toFixed(1);
      const distUnit = distanceKm < 1 ? 'M AWAY' : 'KM AWAY';
      if (etaDistNum) etaDistNum.textContent = distFormatted;
      if (etaDistUnit) etaDistUnit.textContent = distUnit;
      if (etaSpeedText) etaSpeedText.textContent = `Speed: ${Math.round(speed)} km/h`;

      // Calculate arrival time estimate
      const now = new Date();
      now.setMinutes(now.getMinutes() + etaMins);
      const arrivalStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (etaArrivesAt) etaArrivesAt.textContent = `Arrives ~${arrivalStr}`;
    }

    if (etaRoutePct) etaRoutePct.textContent = `${Math.round(pct)}% of route done`;
    if (etaRouteFill) etaRouteFill.style.width = `${Math.max(2, Math.round(pct))}%`;
  },

  // -------------------------------------------------------------
  // Dynamic Route Stops Management (Driver & Citizen Sync)
  // -------------------------------------------------------------
  getRouteStops() {
    return this.driverCustomStops || [];
  },

  setDriverStops(stops, shouldBroadcast = true) {
    if (!Array.isArray(stops)) return;
    this.driverCustomStops = stops;
    localStorage.setItem('cityassist_driver_stops', JSON.stringify(stops));

    if (shouldBroadcast) {
      if (typeof CloudRealtime !== 'undefined') {
        CloudRealtime.publishStops(stops);
      }
      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({ type: 'TRUCK_STOPS_UPDATE', stops: stops });
        } catch (e) {}
      }
    }

    this.renderDriverStopsUI();
    this.renderCitizenStopsUI();

    // Refresh Leaflet checkpoints
    if (typeof LeafletMapEngine !== 'undefined') {
      LeafletMapEngine.refreshCheckpoints();
    }
  },

  addCurrentLocationAsStop(customName, customArea, bins = 35) {
    const lat = this.driverTelemetry.lat || 18.7285;
    const lng = this.driverTelemetry.lng || 73.6765;
    const stopIndex = this.driverCustomStops.length + 1;
    const name = customName ? customName.trim() : `Stop ${stopIndex} (Talegaon Pickup Point)`;
    const area = customArea ? customArea.trim() : "Talegaon Dabhade";

    const newStop = {
      id: `stop-${Date.now()}`,
      name: name,
      area: area,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      bins: Number(bins) || 30,
      status: "active",
      completedAt: null,
      isDoorstep: false
    };

    const stops = [...this.driverCustomStops, newStop];
    this.setDriverStops(stops, true);

    if (typeof CityAssist !== 'undefined') {
      CityAssist.closeModal();
      CityAssist.showToast(`📍 Stop Added at GPS: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
    }
  },

  addCustomStop(name, area, lat, lng, bins = 40) {
    if (!name) return;
    const newStop = {
      id: `stop-${Date.now()}`,
      name: name.trim(),
      area: area ? area.trim() : "Talegaon Dabhade",
      lat: lat ? Number(lat) : (this.driverTelemetry.lat || 18.7285),
      lng: lng ? Number(lng) : (this.driverTelemetry.lng || 73.6765),
      bins: Number(bins) || 35,
      status: this.driverCustomStops.length === 0 ? "active" : "pending",
      completedAt: null,
      isDoorstep: false
    };

    const stops = [...this.driverCustomStops, newStop];
    this.setDriverStops(stops, true);

    if (typeof CityAssist !== 'undefined') {
      CityAssist.closeModal();
      CityAssist.showToast(`✓ Custom Stop "${name}" Added! 🚚`);
    }
  },

  markStopCompleted(stopId) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let foundIdx = -1;
    const updated = this.driverCustomStops.map((s, idx) => {
      if (s.id === stopId) {
        foundIdx = idx;
        return { ...s, status: "completed", completedAt: timeStr };
      }
      return s;
    });

    if (foundIdx >= 0 && foundIdx + 1 < updated.length) {
      if (updated[foundIdx + 1].status !== 'completed') {
        updated[foundIdx + 1].status = 'active';
      }
    }

    this.setDriverStops(updated, true);
    if (typeof CityAssist !== 'undefined') {
      CityAssist.showToast(`✅ Stop marked completed at ${timeStr}`);
    }

    // Check if ALL stops are completed → show Route Completion screen
    const allDone = updated.length > 0 && updated.every(s => s.status === 'completed');
    if (allDone) {
      setTimeout(() => this.showRouteCompletionScreen(updated), 600);
    }
  },

  /**
   * Show the Route Completion celebration overlay with shift stats
   */
  showRouteCompletionScreen(stops) {
    const overlay = document.getElementById('route-completion-overlay');
    if (!overlay) return;

    // Calculate stats
    const totalStops = stops.length;
    const totalBins = stops.reduce((sum, s) => sum + (s.bins || 0), 0);

    // Shift duration: from first stop to now
    let shiftMins = '—';
    if (stops[0] && stops[0].completedAt && stops[stops.length - 1].completedAt) {
      // Estimate shift time from number of stops (rough approximation)
      shiftMins = Math.round(totalStops * 12 + totalStops * 3);
    } else {
      shiftMins = totalStops * 15;
    }

    // Distance estimate
    let totalDistKm = 0;
    for (let i = 1; i < stops.length; i++) {
      totalDistKm += this.calculateHaversineDistance(
        stops[i - 1].lat, stops[i - 1].lng, stops[i].lat, stops[i].lng
      );
    }

    // Populate stats
    const stopEl = document.getElementById('completion-total-stops');
    const binEl = document.getElementById('completion-total-bins');
    const timeEl = document.getElementById('completion-shift-time');
    const distEl = document.getElementById('completion-distance');

    if (stopEl) stopEl.textContent = totalStops;
    if (binEl) binEl.textContent = totalBins;
    if (timeEl) timeEl.textContent = shiftMins;
    if (distEl) distEl.textContent = `${totalDistKm.toFixed(1)} km`;

    // Show overlay
    overlay.style.display = 'flex';
    this.stopLiveTracking();

    // Send completion notification
    if (typeof NotificationEngine !== 'undefined') {
      try {
        NotificationEngine.sendLocalNotification(
          'Route Complete! 🎉',
          `All ${totalStops} stops collected. Great shift, Ramesh!`,
          'route_complete'
        );
      } catch (e) {}
    }
  },

  /**
   * End Shift: Hide completion overlay, reset stops, and return to idle
   */
  endShiftAndReset() {
    const overlay = document.getElementById('route-completion-overlay');
    if (overlay) overlay.style.display = 'none';

    this.resetStops();
    this.stopLiveTracking();
    this.shiftStartTime = null;

    if (typeof CityAssist !== 'undefined') {
      CityAssist.showToast('Shift ended. Route has been reset. ✅');
    }
  },

  deleteStop(stopId) {
    const updated = this.driverCustomStops.filter(s => s.id !== stopId);
    this.setDriverStops(updated, true);
    if (typeof CityAssist !== 'undefined') {
      CityAssist.showToast(`🗑️ Stop removed from route`);
    }
  },

  resetStops() {
    this.setDriverStops([], true);
    if (typeof CityAssist !== 'undefined') {
      CityAssist.showToast(`Cleared all route stops`);
    }
  },

  renderDriverStopsUI() {
    const list = document.querySelector('.driver-stops-list');
    const countBadge = document.getElementById('driver-stops-count');
    const progressBar = document.getElementById('driver-progress-bar');
    const nextStopText = document.getElementById('driver-current-stop-name');
    const stops = this.driverCustomStops || [];

    const completedCount = stops.filter(s => s.status === 'completed').length;
    if (countBadge) countBadge.textContent = `${completedCount} / ${stops.length} Stops`;
    if (progressBar) {
      const pct = stops.length > 0 ? Math.round((completedCount / stops.length) * 100) : 0;
      progressBar.style.width = `${pct}%`;
    }

    const activeStop = stops.find(s => s.status === 'active') || stops.find(s => s.status === 'pending');
    if (nextStopText) {
      nextStopText.textContent = activeStop ? `Next: ${activeStop.name}` : (stops.length > 0 && completedCount === stops.length ? "All Stops Completed! 🎉" : "No stops added yet");
    }

    if (!list) return;

    if (stops.length === 0) {
      list.innerHTML = `
        <div style="text-align:center; padding:18px; background:#F8FAFC; border:1.5px dashed #CBD5E1; border-radius:14px; margin:8px 0;">
          <div style="font-size:1.8rem; margin-bottom:4px;">📍</div>
          <strong style="color:#1E293B; font-size:0.92rem; display:block;">No Stops Added Yet</strong>
          <span style="color:#64748B; font-size:0.8rem; display:block; margin-bottom:12px;">Add real pickup points for citizens to see on their map</span>
          <button type="button" class="primary-green-btn" onclick="GPSTrackerEngine.openAddStopModal()" style="padding:8px 16px; font-size:0.85rem; font-weight:800;">
            ➕ Add First Stop Now
          </button>
        </div>
      `;
      return;
    }

    list.innerHTML = stops.map((s, idx) => {
      const isCompleted = s.status === 'completed';
      const isActive = s.status === 'active';

      return `
        <div class="driver-stop-item ${isActive ? 'active' : (isCompleted ? 'completed-stop' : '')}" id="stop-row-${idx}" style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px; border-radius:14px; border:1px solid ${isActive ? '#86EFAC' : (isCompleted ? '#E2E8F0' : '#CBD5E1')}; background:${isActive ? '#F0FDF4' : '#FFFFFF'}; margin-bottom:8px; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="display:flex; align-items:center; gap:10px; flex:1;">
            <div style="width:28px; height:28px; border-radius:50%; background:${isCompleted ? '#16A34A' : (isActive ? '#0F7943' : '#94A3B8')}; color:#FFF; font-weight:900; font-size:0.85rem; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              ${isCompleted ? '✓' : idx + 1}
            </div>
            <div style="flex:1;">
              <div style="font-weight:800; font-size:0.88rem; color:#0F172A; text-decoration:${isCompleted ? 'line-through' : 'none'};">
                ${s.name} ${s.isDoorstep ? '<span style="color:#2563EB; font-size:0.75rem;">(Citizen Doorstep)</span>' : ''}
              </div>
              <div style="font-size:0.75rem; color:#64748B;">
                ${s.area} • ${s.bins} Bins ${isCompleted ? `• <span style="color:#16A34A; font-weight:700;">Done at ${s.completedAt || ''}</span>` : ''}
              </div>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:6px;">
            ${!isCompleted ? `
              <button type="button" onclick="GPSTrackerEngine.markStopCompleted('${s.id}')" style="background:#DCFCE7; border:1px solid #86EFAC; color:#15803D; padding:6px 10px; border-radius:10px; font-weight:800; font-size:0.75rem; cursor:pointer;" title="Mark this stop as collected">
                ✓ Done
              </button>
            ` : `
              <span style="background:#F1F5F9; color:#475569; padding:4px 8px; border-radius:8px; font-size:0.72rem; font-weight:700;">Finished</span>
            `}
            <button type="button" onclick="GPSTrackerEngine.deleteStop('${s.id}')" style="background:#FEE2E2; border:none; color:#DC2626; padding:6px 8px; border-radius:8px; font-size:0.75rem; cursor:pointer;" title="Delete Stop">
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  renderCitizenStopsUI() {
    // 1. Update Fullscreen Map Checkpoints if container exists
    const fsStops = document.querySelector('.fs-stops-timeline');
    const stops = this.driverCustomStops || [];

    if (fsStops) {
      if (stops.length === 0) {
        fsStops.innerHTML = `
          <div style="text-align:center; padding:16px; color:#64748B; font-size:0.85rem;">
            📍 Driver has not published custom stops yet.<br>Vehicle route will appear dynamically as driver marks stops.
          </div>
        `;
      } else {
        fsStops.innerHTML = stops.map((s, idx) => {
          const isCompleted = s.status === 'completed';
          const isActive = s.status === 'active';

          return `
            <div class="fs-stop-item ${isCompleted ? 'completed' : (isActive ? 'current' : 'upcoming')}">
              <div class="fs-stop-icon" style="background:${isCompleted ? '#16A34A' : (isActive ? '#0F7943' : '#94A3B8')}; color:#FFF;">
                ${isCompleted ? '✓' : (isActive ? '🚚' : idx + 1)}
              </div>
              <div class="fs-stop-info">
                <div class="fs-stop-name">Stop ${idx + 1}: ${s.name}</div>
                <div class="fs-stop-meta">
                  ${s.area} • ${s.bins} Bins ${isCompleted ? `• <span style="color:#16A34A; font-weight:800;">Completed at ${s.completedAt || ''}</span>` : (isActive ? '• <span style="color:#15803D; font-weight:800;">● Active Pickup Zone</span>' : '• ⏳ Upcoming')}
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 2. Update Garbage Screen Live Checkpoints Card
    const citizenCheckpointsList = document.getElementById('citizen-live-stops-list');
    if (citizenCheckpointsList) {
      if (stops.length === 0) {
        citizenCheckpointsList.innerHTML = `
          <div style="text-align:center; padding:12px; color:#64748B; font-size:0.82rem;">
            📍 Route stops will appear here in real-time as marked by the driver.
          </div>
        `;
      } else {
        citizenCheckpointsList.innerHTML = stops.map((s, idx) => {
          const isCompleted = s.status === 'completed';
          const isActive = s.status === 'active';
          return `
            <div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid #F1F5F9;">
              <div style="width:24px; height:24px; border-radius:50%; background:${isCompleted ? '#16A34A' : (isActive ? '#0F7943' : '#E2E8F0')}; color:${isCompleted || isActive ? '#FFF' : '#64748B'}; font-weight:900; font-size:0.75rem; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                ${isCompleted ? '✓' : idx + 1}
              </div>
              <div style="flex:1;">
                <strong style="font-size:0.85rem; color:#0F172A; text-decoration:${isCompleted ? 'line-through' : 'none'};">${s.name}</strong>
                <div style="font-size:0.72rem; color:#64748B;">
                  ${s.area} ${isCompleted ? `• <span style="color:#16A34A; font-weight:700;">Completed ${s.completedAt || ''}</span>` : (isActive ? '• <span style="color:#15803D; font-weight:800;">● Active</span>' : '• ⏳ Upcoming')}
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  },

  openAddStopModal() {
    const lat = (this.driverTelemetry.lat || 18.7285).toFixed(6);
    const lng = (this.driverTelemetry.lng || 73.6765).toFixed(6);
    const nextIdx = (this.driverCustomStops || []).length + 1;

    const modalHtml = `
      <div class="modal-header-block" style="text-align:center; padding-bottom:4px;">
        <div style="font-size:2rem; margin-bottom:4px;">📍</div>
        <h3 style="font-size:1.25rem; font-weight:800; color:#0F172A; margin-bottom:2px;">Add Route Stop</h3>
        <p style="color:#64748B; font-size:0.82rem;">Create a real vehicle pickup point for citizens</p>
      </div>

      <!-- Quick 1-Tap Current Location Button -->
      <button type="button" class="primary-green-btn" onclick="GPSTrackerEngine.addCurrentLocationAsStop('Stop ${nextIdx} (Live GPS Spot)', 'Current Location', 40);" style="width:100%; padding:12px; font-weight:800; font-size:0.9rem; margin-bottom:14px; display:flex; align-items:center; justify-content:center; gap:8px;">
        <span>📍</span> Use Current GPS Spot (${lat}, ${lng})
      </button>

      <div style="text-align:center; font-size:0.78rem; font-weight:800; color:#94A3B8; margin-bottom:12px;">OR ENTER CUSTOM STOP DETAILS</div>

      <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
        <div>
          <label style="display:block; font-size:0.8rem; font-weight:800; color:#475569; margin-bottom:4px;">Stop Name / Landmark</label>
          <input type="text" id="new-stop-name" placeholder="e.g. Samta Colony Main Chowk" value="Stop ${nextIdx} - " style="width:100%; padding:10px 12px; border:1.5px solid #CBD5E1; border-radius:12px; font-size:0.88rem; outline:none; font-family:inherit;">
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <div>
            <label style="display:block; font-size:0.8rem; font-weight:800; color:#475569; margin-bottom:4px;">Colony / Area</label>
            <input type="text" id="new-stop-area" placeholder="e.g. Samta Colony" value="Samta Colony" style="width:100%; padding:10px 12px; border:1.5px solid #CBD5E1; border-radius:12px; font-size:0.88rem; outline:none; font-family:inherit;">
          </div>
          <div>
            <label style="display:block; font-size:0.8rem; font-weight:800; color:#475569; margin-bottom:4px;">Approx. Bins</label>
            <input type="number" id="new-stop-bins" placeholder="e.g. 40" value="40" style="width:100%; padding:10px 12px; border:1.5px solid #CBD5E1; border-radius:12px; font-size:0.88rem; outline:none; font-family:inherit;">
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:800; color:#475569; margin-bottom:4px;">Latitude</label>
            <input type="text" id="new-stop-lat" value="${lat}" style="width:100%; padding:8px 10px; border:1px solid #CBD5E1; border-radius:10px; font-size:0.8rem; outline:none; font-family:inherit;">
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:800; color:#475569; margin-bottom:4px;">Longitude</label>
            <input type="text" id="new-stop-lng" value="${lng}" style="width:100%; padding:8px 10px; border:1px solid #CBD5E1; border-radius:10px; font-size:0.8rem; outline:none; font-family:inherit;">
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <button type="button" onclick="CityAssist.closeModal()" style="background:#F1F5F9; color:#475569; border:none; padding:12px; border-radius:12px; font-weight:700; cursor:pointer;">
          Cancel
        </button>
        <button type="button" class="primary-green-btn" onclick="const n=document.getElementById('new-stop-name')?.value; const a=document.getElementById('new-stop-area')?.value; const b=document.getElementById('new-stop-bins')?.value; const la=document.getElementById('new-stop-lat')?.value; const lo=document.getElementById('new-stop-lng')?.value; GPSTrackerEngine.addCustomStop(n, a, la, lo, b);" style="padding:12px; font-weight:800;">
          Save & Broadcast 🚀
        </button>
      </div>
    `;

    if (typeof CityAssist !== 'undefined') {
      CityAssist.openModal(modalHtml);
    }
  }
};

// Initialize GPS Tracker on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => GPSTrackerEngine.init());
} else {
  GPSTrackerEngine.init();
}
