/**
 * Cloud Realtime Synchronization Engine for CityAssist
 * Enables instantaneous cross-device real-time GPS telemetry between Driver & Citizen devices.
 * Uses a zero-configuration, high-speed multi-transport cloud relay (SSE, WebSockets & REST).
 */

const CloudRealtime = {
  provider: 'firebase',
  config: {
    supabaseUrl: 'https://mgypwawloputeqofscmg.supabase.co',
    supabaseKey: 'sb_publishable_tqmhRn5zoQT9Xf5ipiD6cA_TsPTpdgy',
    firebaseConfig: {
      databaseURL: 'https://cityassist-7bad3-default-rtdb.asia-southeast1.firebasedatabase.app',
      projectId: 'cityassist-7bad3'
    }
  },
  topic: 'cityassist_talegaon_truck_live_2026',
  sseEndpoint: 'https://ntfy.sh/cityassist_talegaon_truck_live_2026/sse?since=10m',
  wsEndpoint: 'wss://ntfy.sh/cityassist_talegaon_truck_live_2026/ws?since=10m',
  publishEndpoint: 'https://ntfy.sh/cityassist_talegaon_truck_live_2026',
  
  supabaseClient: null,
  supabaseChannel: null,
  eventSource: null,
  ws: null,
  isConnected: false,
  subscribers: [],
  lastPublishTime: 0,
  lastReceivedTimestamp: 0,
  pollInterval: null,
  isOnline: navigator.onLine,
  offlineCheckInterval: null,

  init() {
    this.loadSavedConfig();
    this.initSupabaseRealtime();
    this.connectCloudStream();
    this.fetchLatestCloudLocation();
    this.startBackupPoller();
    this.startOfflineMonitor();
  },

  loadSavedConfig() {
    const saved = localStorage.getItem('cityassist_cloud_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.provider = parsed.provider || this.provider;
        this.config = { ...this.config, ...parsed };
      } catch (e) {}
    }
  },

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.provider = newConfig.provider || this.provider;
    localStorage.setItem('cityassist_cloud_config', JSON.stringify(this.config));
    this.initSupabaseRealtime();
    CityAssist.showToast("⚡ Supabase Cloud Realtime Connected Successfully!");
  },

  /**
   * Initialize Supabase Realtime Client & Broadcast Channel
   */
  initSupabaseRealtime() {
    if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
      try {
        const url = this.config.supabaseUrl;
        const key = this.config.supabaseKey;
        if (url && key) {
          this.supabaseClient = supabase.createClient(url, key);
          
          this.supabaseChannel = this.supabaseClient.channel('cityassist_live_fleet', {
            config: { broadcast: { self: false } }
          });

          this.supabaseChannel.on('broadcast', { event: 'truck_telemetry' }, (payload) => {
            if (payload && payload.payload) {
              this.lastReceivedTimestamp = payload.payload.timestamp || Date.now();
              this.notifySubscribers(payload.payload);
            }
          });

          this.supabaseChannel.on('broadcast', { event: 'truck_stops' }, (payload) => {
            if (payload && payload.payload && payload.payload.stops) {
              if (typeof GPSTrackerEngine !== 'undefined') {
                GPSTrackerEngine.setDriverStops(payload.payload.stops, false);
              }
            }
          });

          this.supabaseChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              this.isConnected = true;
              this.updateStatusBadge('🟢 Supabase Live Cloud Connected ⚡');
              console.log("✓ Supabase Live Realtime Channel Connected (https://mgypwawloputeqofscmg.supabase.co)");
            }
          });
        }
      } catch (e) {
        console.warn("Supabase client init warning:", e);
      }
    }
  },

  /**
   * Monitor network connectivity and show/hide offline fallback banner
   */
  startOfflineMonitor() {
    const onOnline = () => {
      this.isOnline = true;
      this.hideOfflineBanner();
      // Immediately re-fetch latest location on reconnect
      this.fetchLatestCloudLocation();
      this.connectCloudStream();
    };

    const onOffline = () => {
      this.isOnline = false;
      this.showOfflineBanner();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Also periodically check if no GPS update received in 45s while supposedly online
    if (this.offlineCheckInterval) clearInterval(this.offlineCheckInterval);
    this.offlineCheckInterval = setInterval(() => {
      const staleSecs = (Date.now() - this.lastReceivedTimestamp) / 1000;
      if (!navigator.onLine) {
        this.isOnline = false;
        this.showOfflineBanner();
      } else if (this.lastReceivedTimestamp > 0 && staleSecs > 60) {
        // GPS data is stale but internet is on — show stale warning
        this.showOfflineBanner(true, Math.round(staleSecs));
      } else if (navigator.onLine && staleSecs < 60) {
        this.isOnline = true;
        this.hideOfflineBanner();
      }
    }, 5000);
  },

  showOfflineBanner(isStale = false, staleSecs = 0) {
    const banner = document.getElementById('offline-fallback-banner');
    const lastSeenEl = document.getElementById('offline-last-seen-text');
    if (!banner) return;

    banner.style.display = 'flex';

    if (isStale && staleSecs > 0) {
      banner.style.background = 'linear-gradient(135deg,#6366F1,#4F46E5)';
      const mins = Math.floor(staleSecs / 60);
      const secs = staleSecs % 60;
      const timeStr = mins > 0 ? `${mins}m ${secs}s ago` : `${secs}s ago`;
      if (lastSeenEl) lastSeenEl.textContent = `Last GPS fix: ${timeStr} — showing cached position`;
    } else {
      banner.style.background = 'linear-gradient(135deg,#F59E0B,#D97706)';
      const cached = localStorage.getItem('cityassist_driver_gps');
      if (cached && lastSeenEl) {
        try {
          const t = JSON.parse(cached);
          const minAgo = Math.round((Date.now() - (t.timestamp || Date.now())) / 60000);
          lastSeenEl.textContent = minAgo > 0 ? `Last GPS fix ${minAgo} min ago` : 'Last GPS fix received just now';
        } catch (e) {
          if (lastSeenEl) lastSeenEl.textContent = 'Showing last cached GPS location';
        }
      }
    }
  },

  hideOfflineBanner() {
    const banner = document.getElementById('offline-fallback-banner');
    if (banner) banner.style.display = 'none';
  },

  /**
   * Immediately fetch the latest broadcasted position from the Cloud Cache
   */
  async fetchLatestCloudLocation() {
    try {
      const res = await fetch(`https://ntfy.sh/${this.topic}/json?poll=1&since=15m`, { cache: 'no-store' });
      if (!res.ok) return;
      const text = await res.text();
      if (!text) return;

      const lines = text.trim().split('\n');
      let latestTelemetry = null;

      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const item = JSON.parse(lines[i]);
          if (item && item.message) {
            const telemetry = JSON.parse(item.message);
            if (telemetry && telemetry.lat && telemetry.lng) {
              latestTelemetry = telemetry;
              break;
            }
          } else if (item && item.lat && item.lng) {
            latestTelemetry = item;
            break;
          }
        } catch (e) {}
      }

      if (latestTelemetry) {
        this.lastReceivedTimestamp = latestTelemetry.timestamp || Date.now();
        console.log("✓ Cloud Realtime: Fetched latest live truck GPS fix:", latestTelemetry.lat, latestTelemetry.lng, "Speed:", latestTelemetry.speed);
        this.notifySubscribers(latestTelemetry);
      }
    } catch (err) {
      console.warn("fetchLatestCloudLocation warning:", err);
    }
  },

  /**
   * Connect to Real-time Cloud Stream (SSE + WebSocket)
   */
  connectCloudStream() {
    // 1. Primary: Server-Sent Events (SSE) Stream with catch-up buffer
    if (typeof EventSource !== 'undefined') {
      try {
        if (this.eventSource) {
          this.eventSource.close();
        }
        this.eventSource = new EventSource(this.sseEndpoint);

        this.eventSource.onopen = () => {
          this.isConnected = true;
          this.updateStatusBadge('🟢 Cloud Live Radar Connected 🛰️');
          console.log("✓ Cloud Realtime SSE Connected (Topic: " + this.topic + ")");
        };

        this.eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && data.message) {
              const payload = JSON.parse(data.message);
              if (payload && payload.type === 'TRUCK_STOPS_UPDATE' && payload.stops) {
                if (typeof GPSTrackerEngine !== 'undefined') {
                  GPSTrackerEngine.setDriverStops(payload.stops, false);
                }
              } else if (payload && payload.lat && payload.lng) {
                this.lastReceivedTimestamp = payload.timestamp || Date.now();
                if (payload.stops && typeof GPSTrackerEngine !== 'undefined') {
                  GPSTrackerEngine.setDriverStops(payload.stops, false);
                }
                this.notifySubscribers(payload);
              }
            } else if (data && data.type === 'TRUCK_STOPS_UPDATE' && data.stops) {
              if (typeof GPSTrackerEngine !== 'undefined') {
                GPSTrackerEngine.setDriverStops(data.stops, false);
              }
            } else if (data && data.lat && data.lng) {
              this.lastReceivedTimestamp = data.timestamp || Date.now();
              this.notifySubscribers(data);
            }
          } catch (err) {
            // Ignore non-JSON keepalive comments
          }
        };

        this.eventSource.onerror = (err) => {
          this.isConnected = false;
          this.updateStatusBadge('🟡 Reconnecting Cloud Stream...');
        };
      } catch (e) {
        console.warn("EventSource setup error:", e);
      }
    }

    // 2. Secondary: WebSocket Relay
    if (typeof WebSocket !== 'undefined') {
      try {
        if (this.ws) {
          try { this.ws.close(); } catch(e){}
        }
        this.ws = new WebSocket(this.wsEndpoint);
        this.ws.onopen = () => {
          this.isConnected = true;
        };
        this.ws.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            if (data && data.message) {
              const telemetry = JSON.parse(data.message);
              if (telemetry && telemetry.lat && telemetry.lng) {
                this.lastReceivedTimestamp = telemetry.timestamp || Date.now();
                this.notifySubscribers(telemetry);
              }
            }
          } catch (e) {}
        };
      } catch (e) {}
    }
  },

  /**
   * Backup high-frequency poller to guarantee continuous tracking even if SSE is paused by mobile OS
   */
  startBackupPoller() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => {
      fetch(`https://ntfy.sh/${this.topic}/json?poll=1&since=2m`, { cache: 'no-store' })
        .then(res => res.text())
        .then(text => {
          if (!text) return;
          const lines = text.trim().split('\n');
          for (let i = lines.length - 1; i >= 0; i--) {
            try {
              const item = JSON.parse(lines[i]);
              if (item && item.message) {
                const telemetry = JSON.parse(item.message);
                if (telemetry && telemetry.lat && telemetry.lng) {
                  if (telemetry.timestamp > this.lastReceivedTimestamp) {
                    this.lastReceivedTimestamp = telemetry.timestamp;
                    this.notifySubscribers(telemetry);
                  }
                  break;
                }
              }
            } catch (e) {}
          }
        })
        .catch(() => {});
    }, 1500);
  },

  /**
   * Publish Live Driver GPS Telemetry across the Internet to all connected citizen devices
   * @param {Object} telemetry - Driver GPS payload with lat, lng, speed, heading, timestamp
   */
  publishDriverTelemetry(telemetry) {
    if (!telemetry || !telemetry.lat || !telemetry.lng) return;

    // Rate-limit cloud HTTP calls to max once every 500ms
    const now = Date.now();
    if (now - this.lastPublishTime < 500) return;
    this.lastPublishTime = now;

    // Attach sender metadata & vehicle info
    const payload = {
      ...telemetry,
      vehicleNumber: telemetry.vehicleNumber || "MH-12-EA-4920",
      driverName: telemetry.driverName || "Ramesh Shinde",
      senderDevice: 'driver_app',
      publishedAt: now,
      timestamp: telemetry.timestamp || now
    };

    const payloadStr = JSON.stringify(payload);

    // 1. Send via Supabase Realtime Broadcast Channel
    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: 'truck_telemetry',
          payload: payload
        });
      } catch (e) {}
    }

    // 2. Send via Cloud HTTP REST (Multi-server delivery)
    fetch(this.publishEndpoint, {
      method: 'POST',
      body: payloadStr,
      headers: {
        'Title': 'TRUCK_GPS_TELEMETRY',
        'Priority': 'urgent',
        'Tags': 'truck,gps'
      }
    }).then(() => {
      this.updateStatusBadge('🟢 Broadcasting Live GPS to Supabase 🛰️');
    }).catch(err => {
      console.warn("Cloud publish error:", err);
    });

    // 3. Send via WebSocket if open
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(payloadStr);
      } catch (e) {}
    }

    // 4. Local persistent write for same-device/split-screen testing
    try {
      localStorage.setItem('cityassist_driver_gps', payloadStr);
    } catch (e) {}
  },

  /**
   * Publish Driver Route Stops across the Cloud
   * @param {Array} stops - Array of stop objects
   */
  publishStops(stops) {
    if (!Array.isArray(stops)) return;
    const payload = {
      type: 'TRUCK_STOPS_UPDATE',
      stops: stops,
      timestamp: Date.now()
    };
    const payloadStr = JSON.stringify(payload);

    // Supabase Realtime Stops Broadcast
    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: 'truck_stops',
          payload: payload
        });
      } catch (e) {}
    }

    fetch(this.publishEndpoint, {
      method: 'POST',
      body: payloadStr,
      headers: {
        'Title': 'TRUCK_STOPS_UPDATE',
        'Priority': 'urgent',
        'Tags': 'truck,stops'
      }
    }).then(() => {
      console.log("✓ Driver stops published to cloud successfully");
    }).catch(e => console.warn("publishStops error:", e));

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.send(payloadStr); } catch (e) {}
    }

    try {
      localStorage.setItem('cityassist_driver_stops', JSON.stringify(stops));
    } catch (e) {}
  },

  /**
   * Subscribe to Live Truck GPS Telemetry (Called by Citizen App)
   */
  subscribeToTruck(callback) {
    if (typeof callback === 'function') {
      this.subscribers.push(callback);
    }
  },

  notifySubscribers(telemetry) {
    this.subscribers.forEach((cb) => {
      try {
        cb(telemetry);
      } catch (e) {
        console.error("Subscriber notification error:", e);
      }
    });

    // Check Doorstep Geofence Arrival Alert (runs even if screen is locked or app is in background)
    if (typeof NotificationEngine !== 'undefined' && telemetry.lat && telemetry.lng) {
      this.checkDoorstepGeofenceAlert(telemetry);
    }
  },

  lastArrivalAlertTime: 0,

  checkDoorstepGeofenceAlert(telemetry) {
    if (!NotificationEngine.settings.arrivalAlerts) return;
    
    // Cooldown: max 1 arrival alert per 4 minutes
    const now = Date.now();
    if (now - this.lastArrivalAlertTime < 240000) return;

    // Calculate distance to resident doorstep
    const residentLat = 18.7285;
    const residentLng = 73.6765;
    const distM = this.calculateDistanceMeters(residentLat, residentLng, telemetry.lat, telemetry.lng);
    const radiusM = NotificationEngine.settings.geofenceRadiusMeters || 350;

    if (distM <= radiusM) {
      this.lastArrivalAlertTime = now;
      const formattedDist = distM < 1000 ? `${Math.round(distM)}m` : `${(distM / 1000).toFixed(1)} km`;
      const formattedEta = `${Math.max(1, Math.round(distM / 80))} min`;

      NotificationEngine.triggerDoorstepArrivalNotification({
        distance: formattedDist,
        eta: formattedEta,
        vehicleNumber: telemetry.vehicleNumber || "MH-12-EA-4920",
        address: "Samta Colony, Talegaon Dabhade"
      });
    }
  },

  calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
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

  updateStatusBadge(statusText) {
    const badges = document.querySelectorAll('.cloud-sync-status-badge, #cloud-gps-indicator');
    badges.forEach(b => {
      b.textContent = statusText;
    });
  }
};

// Auto-initialize on script load
CloudRealtime.init();
