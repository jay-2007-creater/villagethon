/**
 * CityAssist - Essential Background Notification Engine
 * Manages:
 *  1. Service Worker Background Push & Local Notifications (PWA)
 *  2. Native Android Local Notifications (Capacitor)
 *  3. Doorstep Arrival Alerts (Truck Proximity Geofencing)
 *  4. Civic Ticket Status Updates & Emergency Broadcasts
 *  5. Background Notification Scheduler & Channel Management
 */

const NotificationEngine = {
  hasPermission: false,
  settings: {
    arrivalAlerts: true,
    civicUpdates: true,
    emergencyAlerts: true,
    soundEnabled: true,
    vibrationEnabled: true,
    geofenceRadiusMeters: 300
  },

  // Notification history stored for resident
  notificationHistory: [
    {
      id: "notif-001",
      type: "arrival",
      title: "🚚 Garbage Truck Nearby",
      body: "Vehicle MH-12-EA-4920 is 250m away from Samta Colony. Segregate waste now!",
      timestamp: "10 mins ago",
      read: false
    },
    {
      id: "notif-002",
      type: "civic",
      title: "✅ Civic Issue Resolved",
      body: "Your ticket for Overfilled Bin (Talegaon Station Rd) has been resolved by Municipal Squad.",
      timestamp: "1 hour ago",
      read: true
    },
    {
      id: "notif-003",
      type: "emergency",
      title: "📢 Ward 2 Water Supply Notice",
      body: "Scheduled pipeline maintenance tomorrow 8:00 AM - 12:00 PM.",
      timestamp: "Yesterday",
      read: true
    }
  ],

  init() {
    this.loadSettings();
    this.checkPermission();
    this.initNativeChannels();
    this.initServiceWorkerSync();
  },

  loadSettings() {
    const saved = localStorage.getItem('cityassist_notif_settings');
    if (saved) {
      try {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      } catch (e) {}
    }
  },

  saveSettings() {
    localStorage.setItem('cityassist_notif_settings', JSON.stringify(this.settings));
  },

  /**
   * Check if notification permission is currently granted
   */
  async checkPermission() {
    if ('Notification' in window) {
      this.hasPermission = Notification.permission === 'granted';
    }

    // Check Capacitor native permission if available
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
      try {
        const perm = await window.Capacitor.Plugins.LocalNotifications.checkPermissions();
        if (perm.display === 'granted') {
          this.hasPermission = true;
        }
      } catch (e) {}
    }

    return this.hasPermission;
  },

  /**
   * Request OS Notification Permission with user prompt
   */
  async requestPermission() {
    let granted = false;

    // 1. Native Android Permission
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
      try {
        const result = await window.Capacitor.Plugins.LocalNotifications.requestPermissions();
        granted = result.display === 'granted';
      } catch (e) {}
    }

    // 2. Web Browser Notification Permission
    if (!granted && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        granted = res === 'granted';
      } catch (e) {}
    }

    this.hasPermission = granted;

    if (granted) {
      if (typeof CityAssist !== 'undefined') {
        CityAssist.showToast("🔔 Background notifications enabled successfully!");
      }
      this.initNativeChannels();
      this.sendWelcomeNotification();
    } else {
      if (typeof CityAssist !== 'undefined') {
        CityAssist.showToast("⚠️ Notification permission was not granted");
      }
    }

    return granted;
  },

  /**
   * Initialize Android High-Importance Notification Channels
   */
  async initNativeChannels() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
      try {
        await window.Capacitor.Plugins.LocalNotifications.createChannel({
          id: 'cityassist_arrival_alerts',
          name: 'Truck Arrival Alerts',
          description: 'High-priority doorstep garbage vehicle proximity alerts with voice announcement',
          importance: 5, // High / Heads-up popup
          visibility: 1, // Public on lockscreen
          sound: 'arrival_voice_marathi.wav',
          vibration: true,
          lights: true,
          lightColor: '#0F7943'
        });

        await window.Capacitor.Plugins.LocalNotifications.createChannel({
          id: 'cityassist_civic_alerts',
          name: 'Civic Updates & Emergencies',
          description: 'Citizen tickets, issue resolutions, and emergency broadcasts',
          importance: 4,
          visibility: 1,
          sound: 'arrival_siren.wav',
          vibration: true
        });
      } catch (e) {}
    }
  },

  /**
   * Initialize Service Worker message handler for background delivery
   */
  initServiceWorkerSync() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'GEOFENCE_ARRIVAL_TRIGGER') {
          this.triggerDoorstepArrivalNotification(event.data.payload);
        }
      });
    }
  },

  /**
   * Send Welcome Verification Notification
   */
  sendWelcomeNotification() {
    this.sendNotification({
      id: 100,
      title: "🏛️ CityAssist Notifications Active",
      body: "You will now receive doorstep truck arrival alerts even when the app is closed.",
      tag: "cityassist-welcome",
      icon: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120",
      data: { url: "/#garbage" }
    });
  },

  /**
   * Core Universal Dispatcher (Native Android + PWA Service Worker + Web Notification)
   */
  async sendNotification(options = {}) {
    const title = options.title || "CityAssist Talegaon";
    const body = options.body || "Essential Municipal Update";
    const tag = options.tag || `cityassist-${Date.now()}`;
    const sound = this.settings.soundEnabled;
    const vibration = this.settings.vibrationEnabled ? [200, 100, 200, 100, 300] : [];
    const notificationId = options.id || Math.floor(Math.random() * 100000);

    // Add to notification history in-app
    this.notificationHistory.unshift({
      id: `notif-${Date.now()}`,
      type: options.type || "arrival",
      title: title,
      body: body,
      timestamp: "Just now",
      read: false
    });

    // 1. Android Native Local Notification (works when app is closed / killed)
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
      try {
        await window.Capacitor.Plugins.LocalNotifications.schedule({
          notifications: [
            {
              id: notificationId,
              title: title,
              body: body,
              channelId: options.channelId || 'cityassist_arrival_alerts',
              schedule: options.scheduleAt ? { at: options.scheduleAt } : undefined,
              sound: sound ? (options.channelId === 'cityassist_civic_alerts' ? 'arrival_siren.wav' : 'arrival_voice_marathi.wav') : undefined,
              smallIcon: 'ic_launcher',
              largeIcon: 'ic_launcher',
              iconColor: '#0F7943',
              actionTypeId: 'OPEN_APP',
              extra: options.data || { screen: 'garbage' }
            }
          ]
        });
        return true;
      } catch (e) {
        console.warn("Capacitor local notification fallback:", e);
      }
    }

    // 2. Service Worker Notification (works when browser tab is closed/in background)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const swReg = await navigator.serviceWorker.getRegistration();
        if (swReg) {
          if (options.delayMs) {
            // Forward delayed schedule to Service Worker
            navigator.serviceWorker.controller.postMessage({
              type: 'SCHEDULE_BACKGROUND_NOTIFICATION',
              delayMs: options.delayMs,
              payload: {
                title: title,
                body: body,
                tag: tag,
                icon: options.icon || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120',
                badge: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120',
                vibrate: vibration,
                data: options.data || { url: './' }
              }
            });
            return true;
          } else {
            await swReg.showNotification(title, {
              body: body,
              icon: options.icon || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120',
              badge: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120',
              tag: tag,
              vibrate: vibration,
              data: options.data || { url: './' },
              requireInteraction: true, // Keep on screen until user interacts
              actions: [
                { action: 'track', title: '👀 Track Live' },
                { action: 'dismiss', title: 'Dismiss' }
              ]
            });
            return true;
          }
        }
      } catch (e) {
        console.warn("ServiceWorker showNotification note:", e);
      }
    }

    // 3. Web Notification API Fallback
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(title, {
          body: body,
          icon: options.icon || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120',
          tag: tag,
          vibrate: vibration
        });
        n.onclick = () => {
          window.focus();
          if (typeof CityAssist !== 'undefined') {
            CityAssist.navigateTo('garbage');
          }
        };
        return true;
      } catch (e) {}
    }

    return false;
  },

  /**
   * Send Doorstep Truck Arrival Alert
   */
  triggerDoorstepArrivalNotification(truckData = {}) {
    if (!this.settings.arrivalAlerts) return;

    const distance = truckData.distance || "150m";
    const eta = truckData.eta || "2 mins";
    const vehicle = truckData.vehicleNumber || "MH-12-EA-4920";
    const address = truckData.address || "Samta Colony, Talegaon Dabhade";

    this.sendNotification({
      id: 201,
      type: "arrival",
      title: "🚚 Garbage Truck Arriving at Your Doorstep!",
      body: `Vehicle ${vehicle} is ${distance} away (${eta}) from ${address}. Segregate wet & dry waste!`,
      tag: "truck-doorstep-arrival",
      channelId: "cityassist_arrival_alerts",
      icon: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120",
      data: { screen: 'garbage', url: './#garbage' }
    });

    // Play local audio siren if audio announcer is ready
    if (typeof AudioAnnouncer !== 'undefined' && this.settings.soundEnabled) {
      AudioAnnouncer.playArrivalSiren();
    }
  },

  /**
   * Send Civic Ticket Resolution Alert
   */
  triggerCivicResolvedNotification(ticket = {}) {
    if (!this.settings.civicUpdates) return;

    this.sendNotification({
      id: 301,
      type: "civic",
      title: "✅ Civic Issue Resolved by Squad",
      body: `Ticket #${ticket.id || 'TKT-8842'} for "${ticket.category || 'Garbage Issue'}" has been resolved by Municipal Team.`,
      tag: `civic-resolved-${ticket.id || Date.now()}`,
      channelId: "cityassist_civic_alerts",
      data: { screen: 'my-requests', url: './#my-requests' }
    });
  },

  /**
   * Schedule a Test Notification with 3s delay (Allows testing when app is closed / minimized)
   */
  scheduleTestClosedAppAlert() {
    if (!this.hasPermission) {
      this.requestPermission().then(granted => {
        if (granted) this.scheduleTestClosedAppAlert();
      });
      return;
    }

    if (typeof CityAssist !== 'undefined') {
      CityAssist.showToast("⏳ Test alert scheduled in 4 seconds! Minimize or close the app now... 📱");
    }

    const scheduledDate = new Date(Date.now() + 4000);

    this.sendNotification({
      id: 999,
      type: "arrival",
      delayMs: 4000,
      scheduleAt: scheduledDate,
      title: "🚚 Doorstep Arrival Alert (App Closed Test)",
      body: "Vehicle MH-12-EA-4920 has reached Samta Colony Gate! This alert works even when CityAssist is closed.",
      tag: "test-arrival-closed",
      channelId: "cityassist_arrival_alerts",
      data: { screen: 'garbage', url: './#garbage' }
    });
  }
};

// Initialize Notification Engine
NotificationEngine.init();
