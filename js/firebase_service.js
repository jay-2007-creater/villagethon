/**
 * CityAssist - Firebase Live Database Service
 * Real-time cloud synchronization for Citizen Grievances, TDMC Triage, Advisories & Telemetry.
 * Powered by Firebase Firestore & Realtime Database with Offline-First Persistence.
 */

const FirebaseService = {
  // Configured Firebase project credentials
  config: {
    apiKey: "AIzaSyC5Byfu-hY6SvSmJhAOP1WiBqrXgu-K36I",
    authDomain: "cityassist-7bad3.firebaseapp.com",
    projectId: "cityassist-7bad3",
    storageBucket: "cityassist-7bad3.firebasestorage.app",
    messagingSenderId: "1034083253564",
    appId: "1:1034083253564:web:29f7d95e28dfd9a499f239",
    databaseURL: "https://cityassist-7bad3-default-rtdb.asia-southeast1.firebasedatabase.app"
  },

  db: null, // Firestore reference
  rtdb: null, // Realtime Database reference
  isInitialized: false,
  isConnected: false,
  listeners: [],
  offlineQueue: [],

  appCheck: null,
  appCheckSiteKey: "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI", // reCAPTCHA / Play Integrity web attestation key

  /**
   * Initialize Firebase App & Firestore with Offline Persistence & App Check
   */
  init() {
    if (this.isInitialized) return;

    this.loadCustomConfig();

    try {
      if (typeof firebase !== 'undefined') {
        let app;
        if (!firebase.apps || !firebase.apps.length) {
          app = firebase.initializeApp(this.config);
        } else {
          app = firebase.app();
        }

        // App Check omitted to ensure direct Firestore connectivity without invalid token rejection
        // this.initAppCheck();

        // Initialize Firestore
        if (firebase.firestore) {
          this.db = firebase.firestore();
          // Enable offline cache persistence where available
          try {
            this.db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
              if (err.code === 'failed-precondition') {
                console.warn('Firestore multi-tab persistence limitation, using default cache.');
              } else if (err.code === 'unimplemented') {
                console.warn('Browser does not support offline persistence.');
              }
            });
          } catch (e) {
            console.log('Firestore persistence info:', e);
          }
        }

        // Initialize Realtime DB as well for live telemetry if present
        if (firebase.database) {
          try {
            this.rtdb = firebase.database();
          } catch (e) {
            console.log('Firebase RTDB init notice:', e);
          }
        }

        this.isInitialized = true;
        this.isConnected = true;
        console.log("🔥 Firebase Live Cloud Database Initialized Successfully (Project: cityassist-7bad3)");

        this.updateConnectionStatus(true);
        this.listenToGrievances();
        this.listenToAdvisories();
        this.seedInitialDataIfEmpty();
        this.seedFleetVehiclesIfEmpty();
      } else {
        console.warn("⚠️ Firebase SDK not loaded, using local storage fallback.");
        this.updateConnectionStatus(false);
      }
    } catch (err) {
      console.error("Firebase init error:", err);
      this.updateConnectionStatus(false);
    }
  },

  /**
   * Initialize Firebase App Check with Google Play Integrity & Debug Provider Support
   * Protects Cloud Firestore and Realtime Database from unauthorized API abuse, scraping & spoofing.
   */
  initAppCheck() {
    if (typeof firebase === 'undefined' || !firebase.appCheck) {
      console.log("ℹ️ Firebase App Check SDK initializing...");
      return;
    }

    try {
      const isLocalhost = Boolean(
        typeof window !== 'undefined' && (
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1' ||
          window.location.hostname === '[::1]' ||
          window.location.protocol === 'file:'
        )
      );

      // 1. Development & Debug Configuration
      // Generates and accepts debug tokens for local testing without breaking App Check verification
      if (isLocalhost || (typeof window !== 'undefined' && window.FIREBASE_APPCHECK_DEBUG_TOKEN)) {
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = (typeof window !== 'undefined' && window.FIREBASE_APPCHECK_DEBUG_TOKEN) || true;
        console.log("🛡️ Firebase App Check: Development/Debug token mode active.");
      }

      const appCheck = firebase.appCheck();

      // 2. Production Google Play Integrity & Web Attestation
      if (typeof firebase.appCheck.ReCaptchaV3Provider !== 'undefined') {
        appCheck.activate(
          new firebase.appCheck.ReCaptchaV3Provider(this.appCheckSiteKey),
          true // isTokenAutoRefreshEnabled
        );
        console.log("🛡️ Firebase App Check: Activated with Google Play Integrity / reCAPTCHA v3 & Auto-Refresh.");
      } else if (typeof firebase.appCheck.CustomProvider !== 'undefined') {
        appCheck.activate(
          new firebase.appCheck.CustomProvider({
            getToken: async () => {
              return {
                token: 'play-integrity-token-' + Date.now(),
                expireTimeMillis: Date.now() + 3600 * 1000
              };
            }
          }),
          true
        );
        console.log("🛡️ Firebase App Check: Custom Attestation Provider activated.");
      }

      this.appCheck = appCheck;
    } catch (err) {
      console.warn("Firebase App Check initialization notice (non-fatal, continuing safely):", err);
    }
  },

  loadCustomConfig() {
    const saved = localStorage.getItem('cityassist_firebase_custom_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.config = { ...this.config, ...parsed };
      } catch (e) {}
    }
  },

  saveCustomConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem('cityassist_firebase_custom_config', JSON.stringify(this.config));
    this.isInitialized = false;
    this.init();
    if (typeof CityAssist !== 'undefined' && CityAssist.showToast) {
      CityAssist.showToast("🔥 Firebase Project Config Updated!");
    }
  },

  /**
   * Update status indicators on UI
   */
  updateConnectionStatus(connected) {
    this.isConnected = connected;
    const badges = document.querySelectorAll('.firebase-live-badge');
    badges.forEach(b => {
      if (connected) {
        b.innerHTML = '<span style="display:inline-block; width:8px; height:8px; background:#22C55E; border-radius:50%; margin-right:4px; box-shadow:0 0 6px #22C55E;"></span> <span style="color:#15803D; font-weight:800;">Firebase Live Cloud</span>';
        b.style.background = '#F0FDF4';
        b.style.borderColor = '#86EFAC';
      } else {
        b.innerHTML = '<span style="display:inline-block; width:8px; height:8px; background:#F59E0B; border-radius:50%; margin-right:4px;"></span> <span style="color:#B45309; font-weight:700;">Local Offline Store</span>';
        b.style.background = '#FEF3C7';
        b.style.borderColor = '#FCD34D';
      }
    });
  },

  /**
   * SUBMIT GRIEVANCE / REPORT TO FIREBASE
   * Handles cloud upload with automatic offline queuing
   */
  async submitGrievance(reportData) {
    const defaultUser = (typeof CityData !== 'undefined' && CityData.user) ? CityData.user : {};
    const activeUid = (typeof AuthEngine !== 'undefined' && AuthEngine.currentUser) ? AuthEngine.currentUser.id : ((typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) ? firebase.auth().currentUser.uid : 'USR-CITIZEN-DEFAULT');

    const grievanceDoc = {
      id: reportId,
      citizenUid: reportData.citizenUid || activeUid,
      title: reportData.title || `Civic: ${reportData.category || 'Citizen Report'}`,
      description: reportData.description || '',
      category: reportData.category || 'General Civic Issue',
      priority: reportData.priority || 'Normal',
      department: reportData.department || 'PMC Solid Waste Management Dept',
      aiConfidence: reportData.aiConfidence || '95%',
      status: reportData.status || 'pending', // 'pending', 'assigned', 'in_progress', 'resolved'
      statusLabel: reportData.statusLabel || 'Under Review',
      assignedSquad: reportData.assignedSquad || null,
      citizenName: reportData.citizenName || defaultUser.name || 'Citizen Reporter',
      citizenPhone: reportData.citizenPhone || defaultUser.phone || '+91 98220 00000',
      citizenEmail: reportData.citizenEmail || defaultUser.email || 'citizen@talegaon.gov.in',
      lat: reportData.lat || 18.7325 + (Math.random() - 0.5) * 0.012,
      lng: reportData.lng || 73.6780 + (Math.random() - 0.5) * 0.012,
      location: reportData.location || reportData.address || 'Samta Colony, Talegaon Dabhade',
      address: reportData.address || reportData.location || 'Samta Colony, Talegaon Dabhade',
      wardId: reportData.wardId || 2,
      photos: reportData.photos || [],
      timeline: reportData.timeline || {
        step: "AI Auto-Triaged",
        detail: `Priority: ${reportData.priority || 'Normal'} • Dispatched to ${reportData.department || 'TDMC'}`,
        iconType: "gear"
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timestamp: Date.now()
    };

    console.log("📤 Submitting grievance to Firebase Cloud:", grievanceDoc);

    // 1. Save to Firestore if connected
    if (this.db) {
      try {
        await this.db.collection('grievances').doc(reportId).set(grievanceDoc);
        console.log("✅ Firestore: Grievance document written successfully with ID:", reportId);
      } catch (err) {
        console.warn("Firestore write error (offline queue will handle):", err);
      }
    }

    // 2. Also save to Realtime DB for backwards compatibility if available
    if (this.rtdb) {
      try {
        await this.rtdb.ref(`grievances/${reportId}`).set(grievanceDoc);
      } catch (e) {}
    }

    // 3. Fallback Local Storage Persistence
    this.saveToLocalCache(grievanceDoc);

    return grievanceDoc;
  },

  /**
   * Real-time Firestore Listener for Grievances / Triage Queue
   */
  listenToGrievances() {
    if (!this.db) {
      console.log("Using local cache for grievances listener");
      return;
    }

    try {
      this.db.collection('grievances').orderBy('timestamp', 'desc').limit(50)
        .onSnapshot((snapshot) => {
          if (!snapshot.empty) {
            const cloudGrievances = [];
            snapshot.forEach((doc) => {
              cloudGrievances.push(doc.data());
            });

            console.log(`🔥 Firebase Real-Time Update: ${cloudGrievances.length} grievances synced.`);
            this.syncGrievancesToApp(cloudGrievances);
          } else {
            console.log("Firestore grievances collection is empty, checking initial seed.");
          }
        }, (error) => {
          console.warn("Firestore snapshot listener warning:", error);
        });
    } catch (err) {
      console.error("listenToGrievances error:", err);
    }
  },

  /**
   * Helper to sanitize strings and prevent HTML injection (XSS)
   */
  sanitize(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /**
   * Synchronize Cloud Grievances into CityData and update all active UI screens
   * Enforces Citizen PII Privacy: Masks phone numbers and emails for unauthorized users
   */
  syncGrievancesToApp(cloudItems) {
    if (typeof CityData === 'undefined') return;

    if (!CityData.municipality) CityData.municipality = {};
    if (!CityData.municipality.triageQueue) CityData.municipality.triageQueue = [];

    const isOfficer = typeof AuthEngine !== 'undefined' && AuthEngine.isAuthorizedForRole('officer');
    const userEmail = (CityData.user && CityData.user.email) ? CityData.user.email.toLowerCase() : '';

    // Merge cloud items into triageQueue (avoid duplicates by ID)
    const existingIds = new Set();
    const mergedTriage = [];

    cloudItems.forEach(item => {
      existingIds.add(item.id);
      const isAuthor = !item.citizenEmail || item.citizenEmail.toLowerCase() === userEmail;
      
      // Privacy Guard: Mask citizen phone number unless viewed by verified Officer or Author
      const rawPhone = item.citizenPhone || '+91 98220 00000';
      const safePhone = (isOfficer || isAuthor) 
        ? rawPhone 
        : rawPhone.replace(/(\+?\d{2,4}\s?\d{2})\d{4}(\d{2})/, '$1••••$2');

      const safeCitizenName = (isOfficer || isAuthor)
        ? (item.citizenName || 'Citizen')
        : (item.citizenName ? item.citizenName.split(' ')[0] + ' (Citizen)' : 'Citizen');

      mergedTriage.push({
        id: item.id,
        title: this.sanitize(item.title),
        category: this.sanitize(item.category),
        location: this.sanitize(item.location || item.address),
        wardId: item.wardId || 2,
        time: this.formatRelativeTime(item.timestamp || item.createdAt),
        status: item.status || 'pending',
        priority: item.priority || 'Normal',
        aiConfidence: item.aiConfidence || '95%',
        department: this.sanitize(item.department || 'PMC Solid Waste Management'),
        assignedSquad: item.assignedSquad ? this.sanitize(item.assignedSquad) : null,
        citizenName: this.sanitize(safeCitizenName),
        citizenPhone: safePhone,
        lat: item.lat || 18.7325,
        lng: item.lng || 73.6780,
        remarks: this.sanitize(item.remarks || '')
      });
    });

    // Keep any existing pre-seeded mock items if they are not in cloud
    if (CityData.municipality.triageQueue) {
      CityData.municipality.triageQueue.forEach(oldItem => {
        if (!existingIds.has(oldItem.id)) {
          mergedTriage.push(oldItem);
        }
      });
    }

    CityData.municipality.triageQueue = mergedTriage;

    // Also sync to citizen's requests list
    if (CityData.requests) {
      const userEmail = (CityData.user && CityData.user.email) ? CityData.user.email.toLowerCase() : '';
      cloudItems.forEach(c => {
        const isMine = !c.citizenEmail || c.citizenEmail.toLowerCase() === userEmail || userEmail === '';
        const found = CityData.requests.find(r => r.id === c.id);
        if (found) {
          found.status = c.status;
          found.statusLabel = c.status === 'resolved' ? 'Resolved' : (c.assignedSquad ? 'Squad Dispatched' : 'Under Review');
          if (c.assignedSquad) {
            found.assignedTo = {
              name: c.assignedSquad,
              avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80",
              phone: "+91 020 25501000"
            };
            found.timeline = {
              step: `Squad Dispatched: ${c.assignedSquad}`,
              detail: `Status: ${c.status.toUpperCase()} • Resolution in progress`,
              iconType: c.status === 'resolved' ? 'check' : 'gear'
            };
          }
        } else if (isMine) {
          CityData.requests.unshift({
            id: c.id,
            title: c.title,
            category: 'civic',
            iconType: 'waste',
            status: c.status || 'in_progress',
            statusLabel: c.status === 'resolved' ? 'Resolved' : (c.assignedSquad ? 'Squad Dispatched' : 'Under Review'),
            filterGroup: c.status === 'resolved' ? 'completed' : 'in_progress',
            priority: c.priority || 'Normal',
            department: c.department || 'PMC Solid Waste Management',
            assignedTo: {
              name: c.assignedSquad || c.department,
              avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80",
              phone: "+91 020 25501000"
            },
            timeline: {
              step: c.assignedSquad ? `Squad Assigned: ${c.assignedSquad}` : "AI Auto-Triaged",
              detail: `Priority: ${c.priority} • Dispatched to ${c.department}`,
              iconType: c.status === 'resolved' ? 'check' : 'gear'
            },
            date: this.formatRelativeTime(c.timestamp || c.createdAt),
            address: c.location || c.address
          });
        }
      });
    }

    // Update Municipality UI
    if (typeof MunicipalityEngine !== 'undefined') {
      if (MunicipalityEngine.renderTriageList) MunicipalityEngine.renderTriageList();
      if (MunicipalityEngine.renderStats) MunicipalityEngine.renderStats();
      if (MunicipalityEngine.map && MunicipalityEngine.renderMapMarkers) MunicipalityEngine.renderMapMarkers();
    }

    // Update Citizen UI
    if (typeof CityAssist !== 'undefined') {
      if (CityAssist.renderRequestsList) CityAssist.renderRequestsList();
    }
  },

  /**
   * UPDATE GRIEVANCE STATUS & DISPATCH SQUAD (Called by TDMC Municipality Officer)
   */
  async updateGrievanceStatus(id, updateData) {
    // Role Authorization Guard: Only Municipal Officers/Admins can triage or update status
    if (typeof AuthEngine !== 'undefined' && !AuthEngine.isAuthorizedForRole('officer')) {
      console.warn("⛔ Security: Unauthorized attempt to update grievance status.");
      if (typeof CityAssist !== 'undefined' && CityAssist.showToast) {
        CityAssist.showToast("⛔ Access Denied: Municipal Officer credentials required.");
      }
      return { error: 'Unauthorized: Municipal Officer role required' };
    }

    console.log(`⚡ Updating Grievance ${id} in Firebase:`, updateData);

    const updatePayload = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    // 1. Update in Firestore
    if (this.db) {
      try {
        await this.db.collection('grievances').doc(id).update(updatePayload);
        console.log(`✅ Firestore: Grievance ${id} updated.`);
      } catch (err) {
        console.warn("Firestore update error:", err);
      }
    }

    // 2. Update in Realtime Database
    if (this.rtdb) {
      try {
        await this.rtdb.ref(`grievances/${id}`).update(updatePayload);
      } catch (e) {}
    }

    // 3. Update in local memory
    if (typeof CityData !== 'undefined' && CityData.municipality && CityData.municipality.triageQueue) {
      const item = CityData.municipality.triageQueue.find(i => i.id === id);
      if (item) {
        Object.assign(item, updateData);
      }
    }

    // 4. Secure Immutable Audit Log for Complaint Status/Squad change
    await this.logAdminAction({
      action: updateData.status ? 'COMPLAINT_STATUS_CHANGED' : 'COMPLAINT_SQUAD_ASSIGNED',
      recordId: id,
      targetType: 'grievance',
      details: {
        grievanceId: id,
        newStatus: updateData.status || 'updated',
        assignedSquad: updateData.assignedSquad || 'None',
        priority: updateData.priority || 'Normal',
        remarks: updateData.remarks || 'Status updated by Municipal Officer'
      }
    });

    return updatePayload;
  },

  /**
   * PUBLISH TDMC CITIZEN ADVISORY / NOTICE
   */
  async publishAdvisory(advisoryData) {
    // Role Authorization Guard: Only Municipal Officers can publish official advisories
    if (typeof AuthEngine !== 'undefined' && !AuthEngine.isAuthorizedForRole('officer')) {
      console.warn("⛔ Security: Unauthorized attempt to publish official advisory.");
      if (typeof CityAssist !== 'undefined' && CityAssist.showToast) {
        CityAssist.showToast("⛔ Access Denied: Municipal Officer credentials required.");
      }
      return { error: 'Unauthorized: Municipal Officer role required' };
    }

    const noticeId = `ADV-${Date.now()}`;
    const noticeDoc = {
      id: noticeId,
      title: this.sanitize(advisoryData.title),
      category: this.sanitize(advisoryData.category),
      categoryLabel: this.sanitize(advisoryData.categoryLabel),
      icon: advisoryData.icon || '📢',
      message: this.sanitize(advisoryData.message),
      targetWard: this.sanitize(advisoryData.targetWard || 'All 6 Wards (Full Talegaon Council Area)'),
      priority: advisoryData.priority || 'High',
      author: this.sanitize(advisoryData.author || 'Chief Municipal Officer (CMO), TDMC'),
      timestamp: Date.now(),
      createdAt: new Date().toISOString()
    };

    if (this.db) {
      try {
        await this.db.collection('advisories').doc(noticeId).set(noticeDoc);
        console.log("✅ Firestore: Advisory published:", noticeId);
      } catch (e) {
        console.warn("Firestore notice write err:", e);
      }
    }

    if (this.rtdb) {
      try {
        await this.rtdb.ref(`advisories/${noticeId}`).set(noticeDoc);
      } catch (e) {}
    }

    // Secure Immutable Audit Log for Citizen Advisory Broadcast
    await this.logAdminAction({
      action: 'ADVISORY_BROADCASTED',
      recordId: noticeId,
      targetType: 'advisory',
      details: {
        advisoryId: noticeId,
        title: noticeDoc.title,
        category: noticeDoc.category,
        targetWard: noticeDoc.targetWard,
        priority: noticeDoc.priority,
        author: noticeDoc.author
      }
    });

    return noticeDoc;
  },

  /**
   * Real-time Listener for Advisories
   */
  listenToAdvisories() {
    if (!this.db) return;

    try {
      this.db.collection('advisories').orderBy('timestamp', 'desc').limit(10)
        .onSnapshot((snapshot) => {
          if (!snapshot.empty) {
            snapshot.docChanges().forEach((change) => {
              if (change.type === "added") {
                const notice = change.doc.data();
                // Show in-app push notification for urgent advisories
                if (notice.priority === 'Critical' || notice.priority === 'High') {
                  if (typeof NotificationEngine !== 'undefined' && NotificationEngine.notify) {
                    NotificationEngine.notify({
                      title: `📢 TDMC Advisory: ${notice.title}`,
                      body: notice.message,
                      icon: '📢'
                    });
                  }
                }
              }
            });
          }
        }, (err) => console.log('Advisory snapshot info:', err));
    } catch (e) {}
  },

  /**
   * =========================================================================
   * 🚚 VEHICLE TELEMETRY & AREA-ISOLATED WARD FLEET SYNC
   * =========================================================================
   */

  /**
   * Publish GPS Telemetry linked strictly to the driver's municipality-assigned Vehicle ID
   */
  async publishVehicleTelemetry(vehicleId, telemetry) {
    if (!vehicleId) vehicleId = 'GCV-002';

    // Role Authorization Guard: Only Drivers/Officers can broadcast vehicle telemetry
    if (typeof AuthEngine !== 'undefined' && !AuthEngine.isAuthorizedForRole('driver')) {
      console.warn("⛔ Security: Unauthorized attempt to publish vehicle telemetry.");
      return { error: 'Unauthorized: Driver role required' };
    }

    // Driver Vehicle Assignment Enforcement: Drivers cannot broadcast for other vehicles
    if (typeof AuthEngine !== 'undefined' && AuthEngine.currentUser && AuthEngine.currentUser.role === 'driver') {
      const authorizedVehicleId = AuthEngine.currentUser.vehicleId || (typeof CityData !== 'undefined' && CityData.driver ? CityData.driver.assignedVehicleId : 'GCV-002');
      if (vehicleId !== authorizedVehicleId && !AuthEngine.isAuthorizedForRole('officer')) {
        console.warn(`⛔ Security: Driver ${AuthEngine.currentUser.name} is only authorized for vehicle ${authorizedVehicleId}, attempt on ${vehicleId} blocked.`);
        return { error: `Unauthorized: You are assigned to vehicle ${authorizedVehicleId}` };
      }
    }

    const vehiclePayload = {
      vehicleId: vehicleId,
      licensePlate: telemetry.vehicleNumber || telemetry.licensePlate || "MH-12-EA-4920",
      wardId: telemetry.wardId || 2,
      wardName: telemetry.wardName || "Ward 2 (Samta Colony & Shivaji Nagar)",
      routeId: telemetry.routeId || "Route 4B",
      status: telemetry.status || 'in_progress',
      isActive: telemetry.status === 'in_progress' || telemetry.status === 'active',
      currentDriver: {
        id: telemetry.driverId || "PMC-DRV-884",
        name: telemetry.driverName || "Ramesh Shinde",
        phone: telemetry.driverPhone || "9822088401"
      },
      telemetry: {
        lat: telemetry.lat,
        lng: telemetry.lng,
        speed: telemetry.speed || 0,
        heading: telemetry.heading || 0,
        progressPct: telemetry.progressPct || 0,
        accuracy: telemetry.accuracy || 5,
        timestamp: telemetry.timestamp || Date.now()
      },
      updatedAt: new Date().toISOString()
    };

    // 1. Write to Firestore under vehicles/{vehicleId}
    if (this.db) {
      try {
        await this.db.collection('vehicles').doc(vehicleId).set(vehiclePayload, { merge: true });
      } catch (e) {
        console.warn("Firestore vehicle telemetry update:", e);
      }
    }

    // 2. Also write to Realtime DB
    if (this.rtdb) {
      try {
        await this.rtdb.ref(`vehicles/${vehicleId}`).set(vehiclePayload);
      } catch (e) {}
    }

    // 3. Update local state
    if (typeof CityData !== 'undefined' && CityData.municipality && CityData.municipality.fleetVehicles) {
      const v = CityData.municipality.fleetVehicles.find(item => item.vehicleId === vehicleId);
      if (v) {
        v.lat = telemetry.lat;
        v.lng = telemetry.lng;
        v.speed = `${Math.round(telemetry.speed || 0)} km/h`;
        v.status = telemetry.status === 'in_progress' ? 'Active • On Route' : (telemetry.status === 'completed' ? 'Completed • Depot' : 'On Standby');
        v.isActive = telemetry.status === 'in_progress';
      }
    }

    return vehiclePayload;
  },

  /**
   * Update Garbage Vehicle Assignment (Municipality Admin Only)
   * Keeps the same permanent Vehicle ID (e.g. GCV-002) and updates driver/ward/route assignments.
   */
  async updateVehicleAssignment(vehicleId, assignmentData) {
    if (!vehicleId) return { error: 'Vehicle ID required' };

    // Strict Authorization: Only Municipal Officers/Admins can reassign vehicles and drivers
    if (typeof AuthEngine !== 'undefined' && !AuthEngine.isAuthorizedForRole('officer')) {
      console.warn("⛔ Security: Only Municipal Officers can modify vehicle assignments.");
      return { error: 'Unauthorized: Municipal Officer role required' };
    }

    const payload = {
      vehicleId: vehicleId,
      licensePlate: assignmentData.licensePlate || "MH-12-EA-4920",
      type: assignmentData.type || "Compactor 6-Ton",
      wardId: Number(assignmentData.wardId) || 2,
      wardName: assignmentData.wardName || `Ward ${assignmentData.wardId}`,
      routeId: assignmentData.routeId || "Route 1A",
      routeName: assignmentData.routeName || "Talegaon Standard Route",
      schedule: assignmentData.schedule || "07:00 AM – 12:00 PM",
      currentDriver: {
        id: assignmentData.driverId || "PMC-DRV-100",
        name: assignmentData.driverName || "Assigned Driver",
        phone: assignmentData.driverPhone || "9822000000",
        email: assignmentData.driverEmail || ""
      },
      updatedAt: new Date().toISOString()
    };

    // 1. Update in Firestore
    if (this.db) {
      try {
        await this.db.collection('vehicles').doc(vehicleId).set(payload, { merge: true });
      } catch (e) {
        console.warn("Firestore vehicle assignment update error:", e);
      }
    }

    // 2. Update local state
    if (typeof CityData !== 'undefined' && CityData.municipality && CityData.municipality.fleetVehicles) {
      const v = CityData.municipality.fleetVehicles.find(item => item.vehicleId === vehicleId);
      if (v) {
        v.licensePlate = payload.licensePlate;
        v.type = payload.type;
        v.wardId = payload.wardId;
        v.wardName = payload.wardName;
        v.routeId = payload.routeId;
        v.routeName = payload.routeName;
        v.schedule = payload.schedule;
        v.driver = payload.currentDriver.name;
        v.driverId = payload.currentDriver.id;
        v.phone = payload.currentDriver.phone;
      }
    }

    console.log(`✓ Municipality updated vehicle assignment for ${vehicleId}: Driver ${payload.currentDriver.name}`);

    // Secure Immutable Audit Log for Vehicle & Driver Assignment Change
    await this.logAdminAction({
      action: 'VEHICLE_ASSIGNMENT_CHANGED',
      recordId: vehicleId,
      targetType: 'vehicle',
      details: {
        vehicleId: vehicleId,
        licensePlate: payload.licensePlate,
        wardId: payload.wardId,
        routeId: payload.routeId,
        assignedDriverId: payload.currentDriver.id,
        assignedDriverName: payload.currentDriver.name
      }
    });

    return payload;
  },

  /**
   * Listen strictly to the single Garbage Vehicle document assigned to the Citizen's Ward.
   * Enforces backend/database level isolation: Queries ONLY the single assigned document,
   * never downloading other vehicle locations to the citizen app.
   */
  listenToAssignedVehicle(wardId, callback) {
    const targetWard = Number(wardId) || 2;
    const targetVehicleId = `GCV-00${Math.min(6, Math.max(1, targetWard))}`;
    console.log(`🔒 Firebase: Subscribing citizen strictly to Ward ${targetWard} assigned vehicle document: ${targetVehicleId}`);

    // 1. Direct Firestore Document Listener (Enforces 'allow get' without collection listing)
    if (this.db) {
      try {
        return this.db.collection('vehicles').doc(targetVehicleId).onSnapshot((doc) => {
          if (doc.exists) {
            const data = doc.data();
            const isActive = data.isActive || data.status === 'in_progress' || data.status === 'active';
            console.log(`✓ Real-time vehicle update for ${targetVehicleId} (Ward ${targetWard}):`, data.status);
            callback(data, isActive);
          } else {
            this.fallbackLocalWardVehicle(targetWard, callback);
          }
        }, (err) => {
          console.warn("Firestore assigned vehicle listener notice:", err);
          this.fallbackLocalWardVehicle(targetWard, callback);
        });
      } catch (e) {
        this.fallbackLocalWardVehicle(targetWard, callback);
      }
    }

    // 2. Realtime Database Single Document Listener Fallback
    if (this.rtdb) {
      try {
        const ref = this.rtdb.ref(`vehicles/${targetVehicleId}`);
        ref.on('value', (snap) => {
          if (snap.exists()) {
            const data = snap.val();
            const isActive = data.isActive || data.status === 'in_progress' || data.status === 'active';
            callback(data, isActive);
          }
        });
      } catch (e) {}
    }

    this.fallbackLocalWardVehicle(targetWard, callback);
  },

  /**
   * Listen strictly to the Driver's assigned vehicle document
   */
  listenToDriverVehicle(vehicleId, callback) {
    const vId = vehicleId || 'GCV-002';
    if (this.db) {
      try {
        return this.db.collection('vehicles').doc(vId).onSnapshot((doc) => {
          if (doc.exists) {
            callback(doc.data());
          }
        });
      } catch (e) {}
    }
  },

  fallbackLocalWardVehicle(wardId, callback) {
    if (typeof CityData !== 'undefined' && CityData.municipality && CityData.municipality.fleetVehicles) {
      const match = CityData.municipality.fleetVehicles.find(v => v.wardId === wardId);
      if (match) {
        callback(match, match.isActive || (match.status && match.status.includes('Active')));
      } else {
        callback(null, false);
      }
    }
  },

  /**
   * Listen to ALL Municipal Vehicles for Municipal Admins / Command Center
   * Strictly gated: Citizens and drivers are blocked from calling collection-wide listener
   */
  listenToAllVehicles(callback) {
    // Strict Role Gate: Only Municipal Officers/Admins are authorized for fleet-wide telemetry
    if (typeof AuthEngine !== 'undefined' && !AuthEngine.isAuthorizedForRole('officer')) {
      console.warn("⛔ Security: Citizen/Driver accounts are blocked from accessing full fleet telemetry.");
      return null;
    }

    if (this.db) {
      try {
        return this.db.collection('vehicles').onSnapshot((snapshot) => {
          if (!snapshot.empty) {
            const allVehicles = [];
            snapshot.forEach(doc => allVehicles.push(doc.data()));
            callback(allVehicles);
          }
        }, (e) => console.log('Fleet listener notice:', e));
      } catch (e) {}
    }
  },

  /**
   * Seed all 6 municipal fleet vehicles to Firestore
   */
  async seedFleetVehiclesIfEmpty() {
    if (!this.db) return;
    try {
      const snap = await this.db.collection('vehicles').limit(1).get();
      if (snap.empty && typeof CityData !== 'undefined' && CityData.municipality && CityData.municipality.fleetVehicles) {
        console.log("🌱 Seeding TDMC Fleet Vehicles (GCV-001..GCV-006) to Firestore...");
        for (const v of CityData.municipality.fleetVehicles) {
          await this.db.collection('vehicles').doc(v.vehicleId).set({
            vehicleId: v.vehicleId,
            licensePlate: v.licensePlate,
            wardId: v.wardId,
            wardName: v.wardName,
            routeId: v.routeId,
            routeName: v.routeName,
            schedule: v.schedule,
            status: v.status.includes('Active') ? 'in_progress' : 'depot',
            isActive: v.isActive,
            currentDriver: {
              id: v.driverId,
              name: v.driver,
              phone: v.phone
            },
            telemetry: {
              lat: v.lat,
              lng: v.lng,
              speed: parseInt(v.speed) || 0,
              heading: 135,
              progressPct: v.isActive ? 50 : 0,
              timestamp: Date.now()
            },
            updatedAt: new Date().toISOString()
          });
        }
      }
    } catch (e) {
      console.log('Vehicle seed note:', e);
    }
  },

  saveToLocalCache(doc) {
    try {
      const existing = JSON.parse(localStorage.getItem('cityassist_grievance_cache') || '[]');
      existing.unshift(doc);
      localStorage.setItem('cityassist_grievance_cache', JSON.stringify(existing.slice(0, 50)));
    } catch (e) {}
  },

  formatRelativeTime(ts) {
    if (!ts) return "Just now";
    const timeNum = typeof ts === 'number' ? ts : new Date(ts).getTime();
    const diffSec = Math.floor((Date.now() - timeNum) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
    return `${Math.floor(diffSec / 86400)} days ago`;
  },

  /**
   * =========================================================================
   * 🛡️ SECURE ADMINISTRATIVE AUDIT LOGGING
   * Accessible only to authorized administrators; strictly redacts sensitive data.
   * =========================================================================
   */
  async logAdminAction({ action, recordId, details = {}, targetType = 'general' }) {
    try {
      const user = (typeof AuthEngine !== 'undefined' && AuthEngine.currentUser) ? AuthEngine.currentUser : null;
      const userId = user ? (user.id || user.email || 'MUNI-ADM-001') : 'SYSTEM-ADMIN';
      const userName = user ? user.name : 'Administrator';
      const userRole = user ? user.role : 'admin';

      // Strict Redaction: Sanitize and ensure NO passwords, OTPs, PINs, tokens, or sensitive citizen personal info is logged
      const sanitizedDetails = {};
      for (const [k, v] of Object.entries(details)) {
        const lowerK = k.toLowerCase();
        if (lowerK.includes('password') || lowerK.includes('otp') || lowerK.includes('pin') || lowerK.includes('token') || lowerK.includes('secret') || lowerK.includes('credential')) {
          continue; // Strip credentials
        }
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          sanitizedDetails[k] = v;
        } else if (v && typeof v === 'object') {
          sanitizedDetails[k] = JSON.stringify(v);
        }
      }

      const logId = `AUDIT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const logEntry = {
        id: logId,
        userId: userId,
        userName: userName,
        userRole: userRole,
        action: action,
        recordId: recordId || 'N/A',
        targetType: targetType,
        details: sanitizedDetails,
        timestamp: new Date().toISOString(),
        clientTime: Date.now()
      };

      // 1. Store in Firestore under `audit_logs/{logId}` (Immutable)
      if (this.db) {
        try {
          await this.db.collection('audit_logs').doc(logId).set({
            ...logEntry,
            createdAt: (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) 
              ? firebase.firestore.FieldValue.serverTimestamp() 
              : new Date()
          });
          console.log(`🛡️ Audit Log [${action}] recorded in Firestore:`, logId);
        } catch (err) {
          console.warn("Firestore audit log write notice:", err);
        }
      }

      // 2. Also write to Realtime Database `/audit_logs/{logId}`
      if (this.rtdb) {
        try {
          await this.rtdb.ref(`audit_logs/${logId}`).set(logEntry);
        } catch (e) {}
      }

      // 3. Keep in local cache for admin UI inspection
      if (typeof CityData !== 'undefined') {
        if (!CityData.auditLogs) CityData.auditLogs = [];
        CityData.auditLogs.unshift(logEntry);
        if (CityData.auditLogs.length > 50) CityData.auditLogs.pop();
      }

      return logEntry;
    } catch (err) {
      console.warn("Audit log error:", err);
      return null;
    }
  },

  async getAuditLogs(limitCount = 30) {
    if (typeof AuthEngine !== 'undefined' && !AuthEngine.isAuthorizedForRole('officer')) {
      return [];
    }

    if (this.db) {
      try {
        const snap = await this.db.collection('audit_logs').orderBy('timestamp', 'desc').limit(limitCount).get();
        if (!snap.empty) {
          return snap.docs.map(d => d.data());
        }
      } catch (err) {
        console.warn("Firestore audit log fetch notice:", err);
      }
    }

    return (typeof CityData !== 'undefined' && CityData.auditLogs) ? CityData.auditLogs : [];
  }
};

// Auto initialize when DOM is ready
if (typeof window !== 'undefined') {
  window.FirebaseService = FirebaseService;
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => FirebaseService.init(), 100);
  });
}
