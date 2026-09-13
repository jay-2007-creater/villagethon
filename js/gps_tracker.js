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

  // 2. Driver/Vehicle Live Telemetry (Updated continuously in Driver Mode and linked to permanent Vehicle ID)
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
    vehicleId: "GCV-002",
    vehicleNumber: "MH-12-EA-4920",
    vehicleType: "Compactor 6-Ton",
    wardId: 2,
    wardName: "Ward 2 (Samta Colony & Shivaji Nagar)",
    routeId: "Route 4B",
    driverName: "Ramesh Shinde",
    driverId: "PMC-DRV-884",
    driverPhone: "9822088401",
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

    // 6.1 Backend-Enforced Vehicle Document Listener:
    // Subscribes strictly to the single assigned vehicle document for the citizen's ward in Firebase
    if (typeof FirebaseService !== 'undefined' && FirebaseService.listenToAssignedVehicle) {
      const wardId = this.resolveCitizenWard();
      FirebaseService.listenToAssignedVehicle(wardId, (vehicleDoc, isActive) => {
        if (vehicleDoc && isActive && vehicleDoc.telemetry) {
          this.handleIncomingDriverTelemetry({
            ...vehicleDoc.telemetry,
            vehicleId: vehicleDoc.vehicleId,
            wardId: vehicleDoc.wardId,
            routeId: vehicleDoc.routeId,
            status: vehicleDoc.status || 'in_progress',
            driverName: vehicleDoc.currentDriver ? vehicleDoc.currentDriver.name : ''
          });
        } else if (!isActive && vehicleDoc) {
          this.renderStandbyInactiveState(vehicleDoc);
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
    const vehicleId = telemetry.vehicleId || (CityData.driver && CityData.driver.assignedVehicleId) || 'GCV-002';

    // 1. Publish to Firebase Firestore by Permanent Vehicle ID
    if (typeof FirebaseService !== 'undefined' && FirebaseService.publishVehicleTelemetry) {
      FirebaseService.publishVehicleTelemetry(vehicleId, telemetry);
    }

    // 2. Publish to Supabase / Realtime Cloud
    if (typeof CloudRealtime !== 'undefined') {
      try {
        CloudRealtime.publishDriverTelemetry(telemetry);
      } catch (e) {}
    }

    // 3. Broadcast to other tabs/windows
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'DRIVER_GPS_UPDATE',
          telemetry: telemetry
        });
      } catch (e) {}
    }

    // 4. Write to local database / storage
    try {
      localStorage.setItem('cityassist_driver_gps', JSON.stringify(telemetry));
    } catch (e) {}

    // 5. Update all active Citizen & Driver UI components immediately
    this.handleIncomingDriverTelemetry(telemetry);
  },

  /**
   * Resolve Citizen's Ward ID from current address or active profile
   */
  resolveCitizenWard() {
    const loc = this.citizenLocation || {};
    const activeAddr = (typeof CityData !== 'undefined' && CityData.addresses) 
      ? (CityData.addresses.find(a => a.isDefault) || CityData.addresses[0]) 
      : null;
    const addrText = ((activeAddr ? (activeAddr.address + ' ' + activeAddr.label) : '') + ' ' + (loc.address || loc.name || '')).toLowerCase();

    if (addrText.includes('station') || addrText.includes('ward 1') || addrText.includes('market') || addrText.includes('bazaar')) return 1;
    if (addrText.includes('samta') || addrText.includes('ward 2') || addrText.includes('shivaji')) return 2;
    if (addrText.includes('gaothan') || addrText.includes('ward 3') || addrText.includes('indrayani') || addrText.includes('maratha')) return 3;
    if (addrText.includes('model') || addrText.includes('ward 4') || addrText.includes('lake')) return 4;
    if (addrText.includes('midc') || addrText.includes('ward 5') || addrText.includes('industrial') || addrText.includes('tech park')) return 5;
    if (addrText.includes('vadgaon') || addrText.includes('ward 6') || addrText.includes('somatane')) return 6;

    if (typeof CityData !== 'undefined' && CityData.user && CityData.user.ward) {
      const wStr = CityData.user.ward.toLowerCase();
      for (let i = 1; i <= 6; i++) {
        if (wStr.includes(`ward ${i}`)) return i;
      }
    }
    return 2; // Default to Ward 2 (Samta Colony)
  },

  /**
   * Get the Vehicle entity assigned to the Citizen's Ward
   */
  getCitizenAssignedVehicle() {
    const wardId = this.resolveCitizenWard();
    if (typeof CityData !== 'undefined' && CityData.municipality && CityData.municipality.fleetVehicles) {
      const match = CityData.municipality.fleetVehicles.find(v => v.wardId === wardId);
      if (match) return match;
    }
    return {
      vehicleId: "GCV-002",
      licensePlate: "MH-12-EA-4920",
      wardId: 2,
      wardName: "Ward 2 (Samta Colony & Shivaji Nagar)",
      routeId: "Route 4B",
      schedule: "07:00 AM – 12:00 PM",
      status: "Active • On Route",
      isActive: true
    };
  },

  /**
   * Switch the active vehicle for Driver Mode
   */
  /**
   * Synchronize Driver Mode with Municipality-Assigned Vehicle
   * Ensures drivers cannot manually claim other vehicles; assignment is controlled by the Municipality.
   */
  syncDriverAssignment() {
    let assignedVid = 'GCV-002';

    if (typeof AuthEngine !== 'undefined' && AuthEngine.currentUser) {
      if (AuthEngine.currentUser.vehicleId) {
        assignedVid = AuthEngine.currentUser.vehicleId;
      } else if (AuthEngine.currentUser.vehicleNumber) {
        const match = CityData.municipality.fleetVehicles.find(v => v.licensePlate === AuthEngine.currentUser.vehicleNumber);
        if (match) assignedVid = match.vehicleId;
      }
    }

    this.setDriverVehicle(assignedVid, true);
  },

  /**
   * Set the active vehicle for Driver Mode (Enforced by Municipality Assignment)
   */
  setDriverVehicle(vehicleId, isSystemSync = false) {
    if (typeof CityData !== 'undefined' && CityData.municipality && CityData.municipality.fleetVehicles) {
      const v = CityData.municipality.fleetVehicles.find(item => item.vehicleId === vehicleId) || CityData.municipality.fleetVehicles[1];
      if (v) {
        this.driverTelemetry.vehicleId = v.vehicleId;
        this.driverTelemetry.vehicleNumber = v.licensePlate;
        this.driverTelemetry.wardId = v.wardId;
        this.driverTelemetry.wardName = v.wardName;
        this.driverTelemetry.routeId = v.routeId;
        this.driverTelemetry.vehicleType = v.type;
        this.driverTelemetry.driverName = v.driver;
        this.driverTelemetry.driverId = v.driverId;
        this.driverTelemetry.driverPhone = v.phone;

        CityData.driver.assignedVehicleId = v.vehicleId;
        CityData.driver.vehicleNumber = v.licensePlate;
        CityData.driver.vehicleType = v.type;
        CityData.driver.wardId = v.wardId;
        CityData.driver.wardName = v.wardName;
        CityData.driver.routeId = v.routeId;
        CityData.driver.routeName = v.routeName;

        // Re-render driver UI elements
        const vehiclePlateEl = document.getElementById('driver-vehicle-plate-badge');
        if (vehiclePlateEl) vehiclePlateEl.textContent = `${v.vehicleId} • ${v.licensePlate}`;

        const vehicleIdTag = document.getElementById('driver-vehicle-id-tag');
        if (vehicleIdTag) vehicleIdTag.textContent = v.vehicleId;

        const vehiclePlateText = document.getElementById('driver-vehicle-plate-text');
        if (vehiclePlateText) vehiclePlateText.textContent = v.licensePlate;

        const wardTag = document.getElementById('driver-assigned-ward-tag');
        if (wardTag) wardTag.textContent = `📍 ${v.wardName}`;

        if (!isSystemSync && typeof CityAssist !== 'undefined' && CityAssist.showToast) {
          CityAssist.showToast(`🚚 Vehicle: ${v.vehicleId} (${v.licensePlate}) • ${v.wardName}`);
        }
      }
    }
  },

  /**
   * Render Clean Inactive / Standby State for Citizen when no vehicle is active in their Ward
   */
  renderStandbyInactiveState(assignedVehicle) {
    const v = assignedVehicle || this.getCitizenAssignedVehicle();
    const wardName = v ? v.wardName : "your ward";
    const schedule = v ? (v.schedule || "07:00 AM – 12:00 PM") : "07:00 AM – 12:00 PM";
    const vId = v ? v.vehicleId : "GCV-002";

    // 1. Citizen Garbage Tracking Screen
    const gtDistance = document.getElementById('gt-distance-text');
    const gtEta = document.getElementById('gt-eta-text');
    const gtNoticeHeadline = document.querySelector('.gt-notice-headline');
    const gtNoticeSubtext = document.querySelector('.gt-notice-subtext');
    const gtFill = document.getElementById('gt-stepper-fill');
    const gtTruckMarker = document.getElementById('gt-map-truck-marker');
    const inactiveBanner = document.getElementById('citizen-vehicle-inactive-banner');
    const activeHeroCard = document.querySelector('.gt-status-hero-card');

    if (gtDistance) gtDistance.textContent = "Garbage vehicle is currently not active in your area.";
    if (gtEta) gtEta.textContent = `Scheduled Pickup: ${schedule}`;
    if (gtNoticeHeadline) {
      gtNoticeHeadline.innerHTML = `Garbage vehicle is <strong style="color:#D97706;">currently not active</strong> in your area.`;
    }
    if (gtNoticeSubtext) {
      gtNoticeSubtext.textContent = `Collection vehicle operates daily: ${schedule}. Please keep waste ready during this window.`;
    }
    if (gtFill) gtFill.style.width = `0%`;
    if (gtTruckMarker) gtTruckMarker.setAttribute('transform', 'translate(-100, -100)'); // Hide truck pin

    if (inactiveBanner) {
      inactiveBanner.style.display = 'flex';
      const schedText = document.getElementById('inactive-schedule-text');
      if (schedText) schedText.textContent = `📍 ${wardName} • Scheduled Shift: ${schedule}`;
    }

    // 2. Citizen Home Screen Widget
    const homeProximity = document.getElementById('home-proximity-text');
    const homeMiniTruck = document.getElementById('home-mini-truck-marker');
    if (homeProximity) {
      homeProximity.innerHTML = `Vehicle not active in your area (Schedule: ${schedule})`;
    }
    if (homeMiniTruck) {
      homeMiniTruck.setAttribute('transform', 'translate(-100, -100)');
    }

    // 3. ETA Card
    const etaBigNum = document.getElementById('eta-big-number');
    const etaDistNum = document.getElementById('eta-distance-number');
    const etaDistUnit = document.getElementById('eta-distance-unit');
    const etaArrivesAt = document.getElementById('eta-arrives-at-text');
    const etaSpeedText = document.getElementById('eta-speed-text');
    const etaRoutePct = document.getElementById('eta-route-pct-text');
    const etaRouteFill = document.getElementById('eta-route-progress-fill');

    if (etaBigNum) etaBigNum.textContent = '--';
    if (etaDistNum) etaDistNum.textContent = 'OFF';
    if (etaDistUnit) etaDistUnit.textContent = 'DUTY';
    if (etaArrivesAt) etaArrivesAt.textContent = `⏰ Scheduled: ${schedule}`;
    if (etaSpeedText) etaSpeedText.textContent = `Vehicle on Standby`;
    if (etaRoutePct) etaRoutePct.textContent = 'Standby mode';
    if (etaRouteFill) etaRouteFill.style.width = '0%';

    // Hide Leaflet truck marker from citizen map
    if (typeof LeafletMapEngine !== 'undefined' && LeafletMapEngine.truckMarkerCitizen && LeafletMapEngine.citizenMap) {
      try {
        LeafletMapEngine.citizenMap.removeLayer(LeafletMapEngine.truckMarkerCitizen);
        LeafletMapEngine.truckMarkerCitizen = null;
      } catch (e) {}
    }
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
   * Synchronize incoming driver GPS telemetry with Citizen and Driver UI components.
   * ENFORCES AREA ISOLATION & PRIVACY: Citizens only see friendly area collection status without internal metadata.
   */
  handleIncomingDriverTelemetry(telemetry) {
    if (!telemetry || !telemetry.lat || !telemetry.lng) return;

    // -------------------------------------------------------------
    // 1. Update Driver Dashboard Telemetry HUD (#screen-driver)
    // -------------------------------------------------------------
    const driverCoords = document.getElementById('driver-telemetry-coords');
    const driverEta = document.getElementById('driver-eta-display');
    const driverSpeed = document.getElementById('driver-live-speed');
    const driverSatPill = document.getElementById('driver-gps-satellite-status');

    // Calculate distance for driver HUD
    const driverDistKm = this.calculateHaversineDistance(
      telemetry.lat,
      telemetry.lng,
      this.citizenLocation.lat,
      this.citizenLocation.lng
    );
    const driverDistFormatted = driverDistKm < 1 ? `${Math.round(driverDistKm * 1000)} m` : `${driverDistKm.toFixed(1)} km`;
    const driverEtaMins = Math.max(1, Math.round((driverDistKm / Math.max(telemetry.speed || 18, 12)) * 60));

    if (driverCoords) {
      driverCoords.textContent = `GPS: ${telemetry.lat.toFixed(4)}° N, ${telemetry.lng.toFixed(4)}° E (±${telemetry.accuracy || 4}m)`;
    }
    if (driverEta) {
      driverEta.textContent = `${driverEtaMins} mins (${driverDistFormatted})`;
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
    const pct = telemetry.progressPct !== undefined ? telemetry.progressPct : 50;
    if (driverTruckPin) {
      const dX = 24 + (pct / 100) * 286;
      const dY = 72 + Math.sin((pct / 100) * Math.PI) * 20;
      driverTruckPin.setAttribute('transform', `translate(${dX}, ${dY})`);
    }

    // Update Driver Leaflet Map
    if (typeof LeafletMapEngine !== 'undefined' && LeafletMapEngine.driverMap) {
      LeafletMapEngine.updateDriverTruckLocation(telemetry.lat, telemetry.lng, telemetry.speed, telemetry.heading);
    }

    // -------------------------------------------------------------
    // 2. AREA ISOLATION FILTERING FOR CITIZEN SCREEN (#screen-garbage & #screen-home)
    // -------------------------------------------------------------
    const citizenWard = this.resolveCitizenWard();
    const assignedVehicle = this.getCitizenAssignedVehicle();
    const incomingWard = Number(telemetry.wardId) || (telemetry.vehicleId === 'GCV-001' ? 1 : (telemetry.vehicleId === 'GCV-002' ? 2 : (telemetry.vehicleId === 'GCV-003' ? 3 : (telemetry.vehicleId === 'GCV-004' ? 4 : (telemetry.vehicleId === 'GCV-005' ? 5 : 6)))));
    const incomingVehicleId = telemetry.vehicleId || 'GCV-002';

    // Verify if this telemetry belongs to the citizen's assigned ward vehicle
    const isMyWardVehicle = (incomingWard === citizenWard) || (incomingVehicleId === assignedVehicle.vehicleId);

    // If NOT citizen's ward vehicle, DO NOT show on citizen screen!
    if (!isMyWardVehicle) {
      console.log(`🔒 Area Isolation: Ignored telemetry for other ward vehicle (Ward ${incomingWard}). Citizen is in Ward ${citizenWard}.`);
      return;
    }

    // Check if vehicle is active
    const isVehicleActive = (telemetry.status === 'in_progress' || telemetry.status === 'active');

    if (!isVehicleActive) {
      this.renderStandbyInactiveState(assignedVehicle);
      return;
    }

    // Hide inactive banner
    const inactiveBanner = document.getElementById('citizen-vehicle-inactive-banner');
    if (inactiveBanner) inactiveBanner.style.display = 'none';

    // Calculate real Haversine distance between assigned vehicle and citizen
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
    const routeProgressPct = telemetry.progressPct !== undefined 
      ? telemetry.progressPct 
      : Math.min(100, Math.max(0, Math.round((1 - Math.min(distanceKm / 2.5, 1)) * 100)));

    // Update Citizen Garbage Tracking Screen (#screen-garbage)
    const gtDistance = document.getElementById('gt-distance-text');
    const gtEta = document.getElementById('gt-eta-text');
    const gtFill = document.getElementById('gt-stepper-fill');
    const gtTruckMarker = document.getElementById('gt-map-truck-marker');
    const gtNoticeHeadline = document.querySelector('.gt-notice-headline');
    const gtNoticeSubtext = document.querySelector('.gt-notice-subtext');
    const gtVehicleBadge = document.getElementById('gt-assigned-vehicle-badge');

    // Privacy-First: Show friendly municipal vehicle info without internal IDs or license plates
    if (gtVehicleBadge) {
      gtVehicleBadge.textContent = `🚛 Collection Van • ${assignedVehicle.wardName || 'Ward 2'}`;
    }

    if (gtDistance) {
      gtDistance.textContent = distanceKm < 0.15 
        ? "Collection vehicle is at your doorstep!" 
        : `Collection vehicle is ${distanceFormatted} away`;
    }
    if (gtEta) {
      gtEta.textContent = distanceKm < 0.15 
        ? "Arrived at your doorstep!" 
        : `Expected in ${etaMins} mins`;
    }
    if (gtNoticeHeadline) {
      gtNoticeHeadline.innerHTML = distanceKm < 0.15
        ? `Garbage collection vehicle has <strong class="highlight-green-text">arrived at your doorstep.</strong>`
        : `Garbage collection vehicle will arrive in your area <strong class="highlight-green-text">within ${etaMins} mins.</strong>`;
    }
    if (gtNoticeSubtext) {
      gtNoticeSubtext.textContent = `Assigned to ${assignedVehicle.wardName || 'your area'}. Please keep your segregated waste ready.`;
    }

    // Stepper Stage Progress Fill & Status
    if (gtFill) {
      gtFill.style.width = `${Math.max(12, routeProgressPct)}%`;
    }

    let activeStepIdx = 0;
    if (routeProgressPct >= 90 || distanceKm < 0.2) activeStepIdx = 3;
    else if (routeProgressPct >= 60 || distanceKm < 0.8) activeStepIdx = 2;
    else if (routeProgressPct >= 30 || distanceKm < 1.5) activeStepIdx = 1;
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
      const mapX = 220 - (routeProgressPct / 100) * 135;
      const mapY = 15 + (routeProgressPct / 100) * 170;
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
        ? `Vehicle ${incomingVehicleId} at your doorstep 📍`
        : `Vehicle ${incomingVehicleId}: ${distanceFormatted} away (${etaMins}m)`;
    }
    if (homeMiniTruck) {
      const hX = 25 + (routeProgressPct / 100) * 90;
      const hY = 78 - (routeProgressPct / 100) * 45;
      homeMiniTruck.setAttribute('transform', `translate(${hX}, ${hY})`);
    }

    // -------------------------------------------------------------
    // 4. Update Municipality Command Center Fleet Map
    // -------------------------------------------------------------
    const muniTruck = document.getElementById('muni-truck-1');
    if (muniTruck) {
      const muniX = 40 + (routeProgressPct / 100) * 220;
      const muniY = 48 + Math.sin((routeProgressPct / 100) * Math.PI) * 35;
      muniTruck.setAttribute('transform', `translate(${muniX}, ${muniY})`);
    }

    // -------------------------------------------------------------
    // 5. Update Interactive Leaflet Map Truck Pins (ONLY citizen's assigned vehicle)
    // -------------------------------------------------------------
    if (typeof LeafletMapEngine !== 'undefined') {
      LeafletMapEngine.updateTruckLocation(telemetry.lat, telemetry.lng, telemetry.speed, telemetry.heading, incomingVehicleId);
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
    // 8. Update ETA Countdown Card
    // -------------------------------------------------------------
    this.updateETACountdownCard(distanceKm, etaMins, telemetry.speed || 18, routeProgressPct);
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
  },

  /**
   * View Official Municipality Vehicle Assignment Details
   */
  openVehicleSelectModal() {
    const fleet = (typeof CityData !== 'undefined' && CityData.municipality && CityData.municipality.fleetVehicles) 
      ? CityData.municipality.fleetVehicles 
      : [];
    const currentVid = this.driverTelemetry.vehicleId || (CityData && CityData.driver ? CityData.driver.assignedVehicleId : "GCV-002");
    const assignedVehicle = fleet.find(v => v.vehicleId === currentVid) || fleet[1] || {};

    const modalHtml = `
      <div class="modal-header-block" style="text-align:center; padding-bottom:4px;">
        <div style="font-size:2.2rem; margin-bottom:4px;">🔒</div>
        <h3 style="font-size:1.25rem; font-weight:800; color:#0F172A; margin-bottom:2px;">Official Vehicle Assignment</h3>
        <p style="color:#64748B; font-size:0.82rem;">Vehicle and route assignments are centrally managed by the Municipality</p>
      </div>

      <div style="background:#F0FDF4; border:1.5px solid #86EFAC; border-radius:14px; padding:14px; margin:16px 0;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
          <span style="background:#15803D; color:#FFF; font-size:0.85rem; font-weight:900; padding:3px 8px; border-radius:8px;">${assignedVehicle.vehicleId || 'GCV-002'}</span>
          <strong style="color:#0F172A; font-size:0.95rem;">${assignedVehicle.licensePlate || 'MH-12-EA-4920'}</strong>
          <span style="background:#DCFCE7; color:#15803D; font-size:0.72rem; font-weight:800; padding:2px 6px; border-radius:6px; margin-left:auto;">✓ Assigned Driver</span>
        </div>

        <div style="font-size:0.8rem; color:#334155; line-height:1.6;">
          <div>📍 <strong>Ward:</strong> ${assignedVehicle.wardName || 'Ward 2'}</div>
          <div>🗺️ <strong>Route:</strong> ${assignedVehicle.routeId || 'Route 4B'} (${assignedVehicle.routeName || 'Samta Colony'})</div>
          <div>⏰ <strong>Shift:</strong> ${assignedVehicle.schedule || '07:00 AM – 12:00 PM'}</div>
          <div>👤 <strong>Assigned Driver:</strong> ${assignedVehicle.driver || 'Ramesh Shinde'} (${assignedVehicle.phone || '9822088401'})</div>
        </div>
      </div>

      <div style="background:#FEF2F2; border:1px solid #FECACA; border-radius:12px; padding:10px 12px; font-size:0.74rem; color:#991B1B; font-weight:700; margin-bottom:14px;">
        🛡️ Drivers cannot manually switch vehicles. Reassignments must be approved by the Municipal Command Center.
      </div>

      <button type="button" onclick="CityAssist.closeModal()" class="primary-green-btn" style="width:100%; padding:12px; font-weight:800; cursor:pointer;">
        Understood ✓
      </button>
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
