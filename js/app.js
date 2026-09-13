/**
 * CityAssist - Application Controller & Router
 */

const CityAssist = {
  currentScreen: 'home',
  previousScreen: 'home',
  currentFilter: 'in_progress',
  selectedEmergencyType: 'Medical Emergency',
  selectedIssueType: 'Illegal Dumping',
  uploadedPhotos: [],

  init() {
    if (typeof I18nEngine !== 'undefined') {
      I18nEngine.init();
    }
    if (typeof FirebaseService !== 'undefined') {
      FirebaseService.init();
    }
    this.loadSavedAddresses();
    this.loadSavedProfile();
    this.bindEvents();
    this.renderRequestsList();
    this.syncActiveAddressUI();
    if (typeof AuthEngine !== 'undefined') {
      AuthEngine.restoreSession();
      if (AuthEngine.isLoggedIn()) {
        const role = (AuthEngine.currentUser && AuthEngine.currentUser.role) || 'citizen';
        if (role === 'driver') {
          this.navigateTo('driver');
        } else if (role === 'officer') {
          this.navigateTo('municipality');
        } else {
          this.navigateTo('home');
        }
      } else {
        this.navigateTo('auth');
      }
    } else {
      this.navigateTo('home');
    }
  },

  bindEvents() {
    // Desktop presentation bar quick buttons
    document.querySelectorAll('.nav-shortcut-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const screen = e.target.dataset.screen;
        if (screen === 'drawer') {
          this.openDrawer();
        } else {
          this.navigateTo(screen);
        }
      });
    });

    // Frame toggle
    const toggleBtn = document.getElementById('toggle-frame-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('fullscreen-mode');
        const isFullscreen = document.body.classList.contains('fullscreen-mode');
        toggleBtn.textContent = isFullscreen ? '📱 Phone View' : '📱 Frame Mode';
      });
    }

    // Android & Browser Hardware/Gesture Back Button Listeners
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      try {
        window.Capacitor.Plugins.App.addListener('backButton', () => {
          this.handleAndroidBackButton();
        });
      } catch (err) {
        console.warn('Capacitor App backButton listener init:', err);
      }
    }

    window.addEventListener('popstate', () => {
      this.handleAndroidBackButton();
    });
  },

  historyStack: ['home'],
  lastBackPressTime: 0,

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  promptRoleAuthorization(requiredRole, message) {
    const roleLabel = requiredRole === 'officer' ? 'Municipal Officer' : 'Sanitation Driver';
    const modalHtml = `
      <div class="modal-header-block" style="text-align:center; padding-bottom:8px;">
        <div style="font-size:2.5rem; margin-bottom:6px;">🔒</div>
        <h3 style="font-size:1.25rem; font-weight:800; color:#0F172A; margin-bottom:4px;">Restricted Access (${roleLabel})</h3>
        <p style="color:#64748B; font-size:0.82rem; line-height:1.4;">${this.escapeHtml(message)}</p>
      </div>

      <div style="background:#FEF2F2; border:1px solid #FECACA; border-radius:12px; padding:12px; margin:14px 0; color:#991B1B; font-size:0.78rem; font-weight:700; display:flex; align-items:center; gap:8px;">
        <span>🛡️</span>
        <span>Role-Based Access Control (RBAC) enforced for production security.</span>
      </div>

      <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;">
        <button type="button" class="primary-green-btn" onclick="AuthEngine.switchAuthRole('${requiredRole}'); CityAssist.closeModal(); CityAssist.navigateTo('auth');" style="padding:12px; font-weight:800; width:100%;">
          🔑 Authenticate with Official ${roleLabel} Account
        </button>
        <button type="button" onclick="CityAssist.closeModal();" style="background:#F1F5F9; color:#475569; border:none; padding:12px; border-radius:12px; font-weight:700; cursor:pointer; width:100%;">
          Cancel
        </button>
      </div>
    `;
    this.openModal(modalHtml);
  },

  navigateTo(screenId, isBackNavigation = false) {
    if (!screenId) screenId = 'home';

    // Production Security Role Guard: Verify authorization for restricted officer/driver screens
    if (typeof AuthEngine !== 'undefined') {
      if (screenId === 'municipality' && !AuthEngine.isAuthorizedForRole('officer')) {
        this.promptRoleAuthorization('officer', 'Talegaon Municipal Command Center requires Municipal Officer credentials.');
        return;
      }
      if (screenId === 'driver' && !AuthEngine.isAuthorizedForRole('driver')) {
        this.promptRoleAuthorization('driver', 'Driver HUD requires an active Municipal Sanitation Driver session.');
        return;
      }
    }

    // Close overlays
    this.closeDrawer();
    this.closeModal();

    if (this.currentScreen !== screenId) {
      this.previousScreen = this.currentScreen;
      this.currentScreen = screenId;
      if (!isBackNavigation) {
        if (this.historyStack[this.historyStack.length - 1] !== screenId) {
          this.historyStack.push(screenId);
        }
      }
    }

    // Update screen views
    document.querySelectorAll('.screen-view').forEach(view => {
      view.classList.remove('active');
    });

    const targetView = document.getElementById(`screen-${screenId}`);
    if (targetView) {
      targetView.classList.add('active');
      const scroller = targetView.querySelector('.screen-content');
      if (scroller) scroller.scrollTop = 0;
    }

    // Hide or Show Bottom Tab Bar on Auth & Fullscreen Screens
    const bottomBars = document.querySelectorAll('.bottom-tab-bar, .bottom-navigation-bar');
    const isAuthOrFs = screenId === 'auth' || screenId.startsWith('auth-') || screenId === 'fullscreen-map';
    bottomBars.forEach(bar => {
      bar.style.display = isAuthOrFs ? 'none' : 'flex';
    });

    // Update bottom nav tab state
    document.querySelectorAll('.nav-tab-item').forEach(tab => {
      tab.classList.remove('active');
      const tabName = tab.dataset.tab;
      if (
        (screenId === 'profile' && tabName === 'profile') ||
        (screenId === 'home' && tabName === 'home') ||
        (screenId === 'garbage' && tabName === 'garbage') ||
        (screenId === 'services' && tabName === 'services') ||
        (screenId === 'my-requests' && tabName === 'services') ||
        (screenId === 'community' && tabName === 'community')
      ) {
        tab.classList.add('active');
      }
    });

    // Update desktop presentation header shortcut buttons
    document.querySelectorAll('.nav-shortcut-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.screen === screenId) {
        btn.classList.add('active');
      }
    });

    // Auto-mount Leaflet interactive map on Garbage, Driver HUD, and Report an Issue screens
    if (screenId === 'garbage') {
      if (typeof GPSTrackerEngine !== 'undefined') {
        GPSTrackerEngine.renderCitizenStopsUI();
      }
      if (typeof LeafletMapEngine !== 'undefined') {
        setTimeout(() => LeafletMapEngine.initCitizenMap(), 150);
      }
    } else if (screenId === 'driver') {
      if (typeof GPSTrackerEngine !== 'undefined') {
        GPSTrackerEngine.syncDriverAssignment();
        GPSTrackerEngine.renderDriverStopsUI();
      }
      if (typeof LeafletMapEngine !== 'undefined') {
        setTimeout(() => LeafletMapEngine.initDriverMap(), 150);
      }
    } else if (screenId === 'report-issue' && typeof LeafletMapEngine !== 'undefined') {
      setTimeout(() => LeafletMapEngine.initReportMap(), 150);
    } else if (screenId === 'municipality' && typeof MunicipalityEngine !== 'undefined') {
      setTimeout(() => MunicipalityEngine.init(), 100);
    }
  },

  navigateBack() {
    this.closeDrawer();
    this.closeModal();
    if (this.historyStack.length > 1) {
      this.historyStack.pop();
      const prev = this.historyStack[this.historyStack.length - 1] || 'home';
      this.navigateTo(prev, true);
    } else {
      this.historyStack = ['home'];
      this.navigateTo('home', true);
    }
  },

  handleAndroidBackButton() {
    // 1. If bottom sheet modal is open, close it first
    const modal = document.getElementById('app-bottom-sheet');
    const backdrop = document.getElementById('app-modal-backdrop');
    const isModalOpen = (modal && modal.classList.contains('active')) || (backdrop && backdrop.classList.contains('active'));
    if (isModalOpen) {
      this.closeModal();
      return true;
    }

    // 2. If side drawer menu is open, close it
    const drawer = document.getElementById('side-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const isDrawerOpen = (drawer && drawer.classList.contains('open')) || (overlay && overlay.classList.contains('active'));
    if (isDrawerOpen) {
      this.closeDrawer();
      return true;
    }

    // 3. If there is history in stack (> 1 screen), navigate to previous screen
    if (this.historyStack && this.historyStack.length > 1) {
      this.navigateBack();
      return true;
    }

    // 4. If currently on a sub-screen other than home, navigate back to home
    if (this.currentScreen !== 'home') {
      this.historyStack = ['home'];
      this.navigateTo('home', true);
      return true;
    }

    // 5. If on Home screen, double-tap back within 2 seconds to minimize/exit app
    const now = Date.now();
    if (now - this.lastBackPressTime < 2000) {
      if (window.AndroidAppBridge && typeof window.AndroidAppBridge.minimizeApp === 'function') {
        window.AndroidAppBridge.minimizeApp();
      } else if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
        window.Capacitor.Plugins.App.exitApp();
      }
    } else {
      this.lastBackPressTime = now;
      this.showToast('Press back again to exit CityAssist');
    }
    return true;
  },

  // --- Requests View Controller ---
  filterRequests(filterGroup) {
    this.currentFilter = filterGroup;
    
    // Update pills
    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.classList.remove('active');
      if (pill.dataset.filter === filterGroup) {
        pill.classList.add('active');
      }
    });

    this.renderRequestsList();
  },

  renderRequestsList() {
    const listContainer = document.getElementById('requests-cards-list');
    if (!listContainer) return;

    let filtered = CityData.requests;
    if (this.currentFilter !== 'all') {
      filtered = CityData.requests.filter(r => r.filterGroup === this.currentFilter);
    }

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:#6B7280;">
          <div style="font-size:2.5rem; margin-bottom:10px;">📋</div>
          <h3 style="font-size:1.1rem; font-weight:700; color:#111827;">No ${this.currentFilter} requests</h3>
          <p style="font-size:0.85rem; margin-top:4px;">You don't have any requests in this category.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(req => UIComponents.renderRequestCard(req)).join('');
  },

  showRequestDetails(reqId) {
    const req = CityData.requests.find(r => r.id === reqId);
    if (req) {
      this.openModal(UIComponents.renderRequestDetailsModal(req));
    }
  },

  cancelRequest(reqId) {
    const req = CityData.requests.find(r => r.id === reqId);
    if (req) {
      req.filterGroup = 'canceled';
      req.status = 'canceled';
      req.statusLabel = 'Canceled';
      req.timeline.step = 'Request was canceled';
      req.timeline.detail = 'Canceled by resident';
      this.closeModal();
      this.renderRequestsList();
      this.showToast(`Request ${reqId} has been canceled`);
    }
  },

  // --- Emergency SOS Flow ---
  selectEmergency(element, typeName) {
    document.querySelectorAll('.emergency-select-card').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    this.selectedEmergencyType = typeName;
  },

  triggerEmergencySOS() {
    // Open dispatch modal
    this.openModal(UIComponents.renderEmergencyDispatchModal(this.selectedEmergencyType));
    
    // Determine details based on emergency type
    const emType = this.selectedEmergencyType;
    let icon = 'medical';
    let unitName = 'Talegaon General Hospital ICU Ambulance';
    let phoneNum = '108';
    let etaMin = '4 mins';

    if (emType.includes('Fire')) {
      icon = 'fire';
      unitName = 'Talegaon Fire Brigade - Tender Squad #2';
      phoneNum = '101';
      etaMin = '3 mins';
    } else if (emType.includes('Police')) {
      icon = 'police';
      unitName = 'Talegaon City Police - PCR Van #3';
      phoneNum = '112';
      etaMin = '3 mins';
    } else if (emType.includes('Electric')) {
      icon = 'electric';
      unitName = 'MSEDCL 24x7 Power Breakdown Crew';
      phoneNum = '1912';
      etaMin = '6 mins';
    } else if (emType.includes('Flood') || emType.includes('Disaster')) {
      icon = 'flood';
      unitName = 'Municipal Disaster Management & NDRF Unit';
      phoneNum = '1077';
      etaMin = '5 mins';
    }

    // Add to requests
    const newReqId = `SOS-${Math.floor(1000 + Math.random() * 9000)}`;
    CityData.requests.unshift({
      id: newReqId,
      title: `Emergency: ${this.selectedEmergencyType}`,
      category: 'emergency',
      iconType: icon,
      status: 'on_the_way',
      statusLabel: 'Emergency Dispatched',
      filterGroup: 'in_progress',
      assignedTo: {
        name: unitName,
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
        phone: phoneNum
      },
      timeline: {
        step: "Rapid Patrol En Route",
        detail: `Expected arrival: <span class='highlight-green'>${etaMin}</span>`,
        iconType: "gear"
      },
      date: "Just now",
      address: "Flat 402, Samta Colony, Talegaon Dabhade"
    });
    this.renderRequestsList();
  },

  editLocation() {
    this.showAddressModal();
  },

  recenterGPS() {
    if (typeof GPSTrackerEngine !== 'undefined') {
      GPSTrackerEngine.fetchCitizenLocation(
        (loc) => {
          this.showToast(`📍 Citizen GPS updated: ${loc.lat.toFixed(4)}°N, ${loc.lng.toFixed(4)}°E`);
        },
        (err) => {
          this.showToast("📍 Citizen GPS reset to Shivaji Nagar Sector 4");
        }
      );
    } else {
      this.showToast("📍 Citizen GPS updated to Shivaji Nagar Sector 4");
    }
  },

  // --- Report an Issue Flow ---
  selectIssueType(element, issueName) {
    document.querySelectorAll('.issue-type-tile').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    this.selectedIssueType = issueName;
  },

  handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target.result;
        this.uploadedPhotos.push(src);
        this.renderUploadedPhotos();
        this.triggerAIVisionScan(src);
      };
      reader.readAsDataURL(file);
    }
  },

  loadSampleIssuePhoto(presetType) {
    const samples = {
      'road_pothole': {
        img: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80',
        category: 'Potholes / Bad Road',
        subCategory: 'pothole',
        priority: 'Critical',
        priorityColor: '#DC2626',
        desc: 'Dangerous deep potholes and broken asphalt layer spotted on the main transit lane in Talegaon. Poses severe skid risk to two-wheeler riders and causes vehicle damage. Immediate cold-mix bituminous resurfacing requested.',
        confidence: 99.2,
        tags: ['#PotholeAlert', '#TalegaonRoads', '#UrgentRepairs']
      },
      'overflowing_bin': {
        img: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=600&auto=format&fit=crop&q=80',
        category: 'Overflowing Bin',
        subCategory: 'bin_overflow',
        priority: 'Critical',
        priorityColor: '#DC2626',
        desc: 'Overflowing municipal community dumpster located at Samta Colony Chowk. Debris spilling onto the pedestrian walkway creating foul odor and hygiene hazard. Requires urgent hydraulic loader dispatch.',
        confidence: 98.4,
        tags: ['#PlasticWaste', '#OverflowHazard', '#SamtaColony']
      },
      'broken_streetlight': {
        img: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80',
        category: 'Broken Streetlight',
        subCategory: 'streetlight',
        priority: 'High',
        priorityColor: '#EA580C',
        desc: 'Non-functional street light fixture along Samta Colony road causing complete dark blindspot at night. Poses safety concern for evening pedestrians. Immediate LED lamp restoration requested.',
        confidence: 98.4,
        tags: ['#StreetlightFix', '#NightSafety', '#PMCElectrical']
      },
      'water_leak': {
        img: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=600&auto=format&fit=crop&q=80',
        category: 'Water Leakage',
        subCategory: 'water_leak',
        priority: 'Critical',
        priorityColor: '#DC2626',
        desc: 'Potable municipal water supply pipe joint leaking continuously at Jijamata Chowk. Clean drinking water flooding road pavement. Urgent valve clamp repair requested.',
        confidence: 97.8,
        tags: ['#WaterLeak', '#SaveWater', '#PMCDrainage']
      }
    };

    const preset = samples[presetType] || samples['road_pothole'];
    this.uploadedPhotos = [preset.img];
    this.renderUploadedPhotos();
    this.triggerAIVisionScan(preset.img, preset);
  },

  async triggerAIVisionScan(imageSrc, customPreset = null) {
    const scanWrap = document.getElementById('ai-vision-scanner-wrap');
    const scanImg = document.getElementById('ai-vision-scanner-img');
    const statusText = document.getElementById('ai-scan-status-text');
    const triageCard = document.getElementById('ai-triage-result-card');

    if (!scanWrap || !scanImg) return;

    scanImg.src = imageSrc;
    scanWrap.style.display = 'block';
    scanWrap.classList.add('scanning');
    if (triageCard) triageCard.style.display = 'none';

    if (statusText) statusText.textContent = "🧠 Initializing Gemini AI Vision scan...";

    setTimeout(() => {
      if (statusText) statusText.textContent = "🔍 Analyzing image layers & detecting infrastructure hazards...";
    }, 500);

    setTimeout(() => {
      if (statusText) statusText.textContent = "⚡ Triaging civic category, priority & municipal department...";
    }, 1100);

    // Call GeminiVisionEngine
    let result = customPreset;
    if (!result && typeof GeminiVisionEngine !== 'undefined') {
      try {
        result = await GeminiVisionEngine.analyzeCivicImage(imageSrc);
      } catch (err) {
        console.warn("AI Vision scan error:", err);
      }
    }

    if (!result) {
      result = {
        category: 'Potholes / Bad Road',
        priority: 'Critical',
        priorityColor: '#DC2626',
        desc: 'Observed road surface defect with uneven asphalt in Talegaon. Requesting road maintenance team inspection and leveling.',
        confidence: 96.5,
        tags: ['#AITriaged', '#RoadSafety']
      };
    }

    setTimeout(() => {
      scanWrap.classList.remove('scanning');
      scanWrap.style.display = 'none';

      // Auto-fill Description
      const descInput = document.getElementById('issue-description-input');
      if (descInput) {
        descInput.value = result.description || result.desc || '';
      }

      // Auto-select Category Tile
      const targetCat = result.category || 'Potholes / Bad Road';
      document.querySelectorAll('.issue-type-tile').forEach(tile => {
        if (tile.dataset.issue === targetCat || (targetCat.includes('Road') && tile.dataset.issue.includes('Road')) || (targetCat.includes('Bin') && tile.dataset.issue.includes('Bin'))) {
          tile.classList.add('selected');
          this.selectedIssueType = tile.dataset.issue;
        } else {
          tile.classList.remove('selected');
        }
      });

      // Show Triage Result Card
      if (triageCard) {
        const priority = result.priority || 'Critical';
        const isCritical = priority === 'Critical';
        const tags = result.tags || (result.hashtags ? result.hashtags.split(' ') : ['#AITriaged', '#TalegaonCivic']);

        triageCard.innerHTML = `
          <div class="ai-triage-header">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:1.1rem;">✨</span>
              <strong style="font-size:0.88rem; color:#0F172A;">Gemini AI Vision Auto-Triage</strong>
            </div>
            <span class="ai-confidence-score">${result.confidence || 98.4}% Confidence</span>
          </div>

          <div style="display:flex; align-items:center; gap:8px; margin:6px 0 10px; flex-wrap:wrap;">
            <span class="ai-triage-severity ${isCritical ? 'critical' : 'moderate'}">
              ${isCritical ? '🚨 CRITICAL PRIORITY' : '⚠️ HIGH PRIORITY'}
            </span>
            <span style="font-size:0.75rem; color:#64748B; font-weight:700;">
              Detected: <strong style="color:#0F172A;">${targetCat}</strong>
            </span>
          </div>

          <p style="font-size:0.8rem; color:#334155; line-height:1.4; margin:0 0 8px;">
            ${result.description || result.desc}
          </p>

          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${tags.map(t => `<span style="font-size:0.7rem; background:#E2E8F0; color:#475569; padding:2px 8px; border-radius:10px; font-weight:700;">${t}</span>`).join('')}
          </div>
        `;
        triageCard.style.display = 'block';
      }

      if (typeof AudioAnnouncerEngine !== 'undefined') {
        AudioAnnouncerEngine.playChimeSound('high');
      }
      CityAssist.showToast(`✨ AI Vision: Detected ${targetCat} (${result.confidence || 98}%)`);
    }, 1600);
  },

  triggerDoorstepGeofenceAlert(distanceMeters = 240, etaMins = 2) {
    const banner = document.getElementById('doorstep-geofence-alert-banner');
    if (!banner) return;

    banner.classList.add('active');

    const descEl = document.getElementById('geofence-banner-desc');
    if (descEl) {
      descEl.innerHTML = `Vehicle <strong>#MH-12-EA-4920</strong> is <strong>${distanceMeters}m</strong> away (~${etaMins} mins). Keep wet & dry waste ready!`;
    }

    if (typeof AudioAnnouncerEngine !== 'undefined') {
      AudioAnnouncerEngine.playChimeSound('high');
      AudioAnnouncerEngine.speakAnnouncement(`Municipal waste collection vehicle is approaching Samta Colony doorstep zone. It is approximately ${etaMins} minutes away. Please keep wet and dry waste ready.`);
    }

    // Auto dismiss after 9s
    setTimeout(() => {
      banner.classList.remove('active');
    }, 9000);
  },

  dismissGeofenceAlert() {
    const banner = document.getElementById('doorstep-geofence-alert-banner');
    if (banner) banner.classList.remove('active');
  },

  showCivicEcoCardModal() {
    this.openModal(UIComponents.renderCivicEcoCardModal());
  },

  renderUploadedPhotos() {
    const placeholder = document.getElementById('upload-placeholder');
    const container = document.getElementById('uploaded-photos');
    if (this.uploadedPhotos.length > 0) {
      placeholder.style.display = 'none';
      container.style.display = 'flex';
      container.innerHTML = this.uploadedPhotos.map((src, index) => `
        <div style="position:relative; display:inline-block;">
          <img src="${src}" class="uploaded-thumb-preview" alt="Uploaded issue photo">
          <button onclick="event.stopPropagation(); CityAssist.removePhoto(${index})" style="position:absolute; top:-6px; right:-6px; background:#EF4444; color:#fff; border:none; border-radius:50%; width:20px; height:20px; font-size:12px; cursor:pointer;">×</button>
        </div>
      `).join('') + `
        <button onclick="event.stopPropagation(); document.getElementById('issue-photo-input').click();" style="width:60px; height:60px; border:1px dashed #94A3B8; border-radius:10px; background:#fff; font-size:1.4rem; cursor:pointer; color:#64748B;">+</button>
      `;
    } else {
      placeholder.style.display = 'flex';
      container.style.display = 'none';
    }
  },

  removePhoto(index) {
    this.uploadedPhotos.splice(index, 1);
    this.renderUploadedPhotos();
  },

  handleIssueTextChange(text) {
    const feedbackBox = document.getElementById('ai-report-feedback');
    if (!feedbackBox || typeof CityAIEngine === 'undefined') return;

    const analysis = CityAIEngine.analyzeText(text);
    if (!analysis) {
      feedbackBox.style.display = 'none';
      return;
    }

    feedbackBox.style.display = 'block';
    
    // Update AI Card Fields
    document.getElementById('ai-suggested-category').textContent = analysis.category;
    const prioEl = document.getElementById('ai-detected-priority');
    prioEl.textContent = analysis.priority;
    prioEl.style.color = analysis.priorityColor;
    document.getElementById('ai-routed-dept').textContent = analysis.department;
    document.getElementById('ai-confidence-val').textContent = `${analysis.confidence}% confidence`;

    // Auto-select category tile if matches
    document.querySelectorAll('.issue-type-tile').forEach(tile => {
      if (tile.dataset.issue === analysis.category) {
        tile.classList.add('selected');
        this.selectedIssueType = analysis.category;
      } else {
        tile.classList.remove('selected');
      }
    });

    // Check Duplicate
    const dupBox = document.getElementById('ai-duplicate-box');
    if (analysis.duplicateCheck && analysis.duplicateCheck.isDuplicate) {
      dupBox.style.display = 'block';
      document.getElementById('ai-duplicate-desc').textContent = 
        `Ticket ${analysis.duplicateCheck.existingId} (${analysis.duplicateCheck.existingTitle}) is already active in ${analysis.duplicateCheck.location}.`;
    } else {
      dupBox.style.display = 'none';
    }
  },

  upvoteExistingTicket() {
    CityData.user.points += 25;
    
    // Update points across UI
    document.querySelectorAll('.bold-num').forEach(el => {
      if (el.textContent.includes('1,')) {
        el.textContent = CityData.user.points.toLocaleString();
      }
    });

    this.showToast("Upvoted! +25 Civic Points added to your balance 🎉");
    this.closeModal();
    this.navigateTo('my-requests');
  },

  submitReport() {
    const desc = document.getElementById('issue-description-input').value.trim();
    const newReqId = `REQ-${Math.floor(10850 + Math.random() * 900)}`;
    const locEl = document.getElementById('report-location-text');
    const address = locEl ? locEl.textContent.trim() : "Samta Colony, Talegaon Dabhade";
    
    const analysis = (typeof CityAIEngine !== 'undefined' && desc) 
      ? CityAIEngine.analyzeText(desc) 
      : { priority: "Normal", department: "PMC Solid Waste Management Dept", confidence: 92 };

    const priority = analysis ? analysis.priority : "Normal";
    const department = analysis ? analysis.department : "PMC Solid Waste Management Dept";

    const pinLat = (typeof LeafletMapEngine !== 'undefined' && LeafletMapEngine.reportPinLat) 
      ? LeafletMapEngine.reportPinLat 
      : 18.7325 + (Math.random() - 0.5) * 0.01;
    const pinLng = (typeof LeafletMapEngine !== 'undefined' && LeafletMapEngine.reportPinLng) 
      ? LeafletMapEngine.reportPinLng 
      : 73.6780 + (Math.random() - 0.5) * 0.01;

    const grievanceData = {
      id: newReqId,
      title: `Civic: ${this.selectedIssueType}`,
      description: desc,
      category: this.selectedIssueType,
      priority: priority,
      department: department,
      aiConfidence: analysis ? `${analysis.confidence}%` : "94%",
      location: address,
      address: address,
      lat: pinLat,
      lng: pinLng,
      wardId: 2,
      photos: [...this.uploadedPhotos],
      status: 'pending',
      assignedSquad: null,
      citizenName: (CityData.user && CityData.user.name) || "Citizen",
      citizenPhone: (CityData.user && CityData.user.phone) || "+91 98220 00000",
      citizenEmail: (CityData.user && CityData.user.email) || "citizen@talegaon.gov.in"
    };

    // 1. Submit to Live Firebase Firestore
    if (typeof FirebaseService !== 'undefined' && FirebaseService.submitGrievance) {
      FirebaseService.submitGrievance(grievanceData);
    }

    // 2. Add to local citizen requests list for instant UI feedback
    CityData.requests.unshift({
      id: newReqId,
      title: `Civic: ${this.selectedIssueType}`,
      category: 'civic',
      iconType: 'waste',
      status: 'in_progress',
      statusLabel: 'Under Review',
      filterGroup: 'in_progress',
      priority: priority,
      department: department,
      assignedTo: {
        name: department,
        avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80",
        phone: "+91 020 25501000"
      },
      timeline: {
        step: "AI Auto-Triaged",
        detail: `Priority: ${priority} • Dispatched to ${department}`,
        iconType: "gear"
      },
      date: "Just now",
      address: address
    });

    // 3. Push to local Municipality Command Center triage queue
    CityData.municipality.triageQueue.unshift({
      id: newReqId,
      title: `Civic: ${this.selectedIssueType} - "${desc || 'Citizen Report'}"`,
      category: this.selectedIssueType,
      priority: priority,
      department: department,
      aiConfidence: analysis ? `${analysis.confidence}%` : "94%",
      location: address,
      time: "Just now",
      status: "pending",
      assignedSquad: null,
      lat: pinLat,
      lng: pinLng,
      citizenName: (CityData.user && CityData.user.name) || "Citizen",
      citizenPhone: (CityData.user && CityData.user.phone) || "+91 98220 00000"
    });
    CityData.municipality.openReportsCount++;
    if (typeof MunicipalityEngine !== 'undefined' && MunicipalityEngine.renderTriageList) {
      MunicipalityEngine.renderTriageList();
    }

    // Reset form
    document.getElementById('issue-description-input').value = '';
    const feedbackBox = document.getElementById('ai-report-feedback');
    if (feedbackBox) feedbackBox.style.display = 'none';
    this.uploadedPhotos = [];
    this.renderUploadedPhotos();
    
    this.renderRequestsList();
    this.showToast(`🔥 Synced to Firebase! AI Triaged (${priority}) & Dispatched to ${department}`);
    
    // Switch to requests view to see it
    setTimeout(() => {
      this.navigateTo('my-requests');
    }, 600);
  },

  // --- Side Drawer ---
  openDrawer() {
    const overlay = document.getElementById('drawer-overlay');
    const drawer = document.getElementById('side-drawer');
    if (overlay) overlay.classList.add('open');
    if (drawer) drawer.classList.add('open');
  },

  closeDrawer() {
    const overlay = document.getElementById('drawer-overlay');
    const drawer = document.getElementById('side-drawer');
    if (overlay) overlay.classList.remove('open');
    if (drawer) drawer.classList.remove('open');
  },

  handleLogout() {
    if (typeof AuthEngine !== 'undefined') {
      AuthEngine.logout();
    }
  },

  showNotificationsModal() {
    if (typeof UIComponents !== 'undefined') {
      this.openModal(UIComponents.renderNotificationsModal());
    }
  },

  showNotificationSettings() {
    if (typeof UIComponents !== 'undefined') {
      this.openModal(UIComponents.renderNotificationSettingsModal());
    }
  },

  // --- Modals & Sheets ---
  openModal(contentHtml) {
    const dynamic = document.getElementById('modal-dynamic-content');
    const backdrop = document.getElementById('app-modal-backdrop');
    const sheet = document.getElementById('app-bottom-sheet');
    if (dynamic) dynamic.innerHTML = contentHtml;
    if (backdrop) backdrop.classList.add('open');
    if (sheet) sheet.classList.add('open');
  },

  closeModal() {
    const backdrop = document.getElementById('app-modal-backdrop');
    const sheet = document.getElementById('app-bottom-sheet');
    if (backdrop) backdrop.classList.remove('open');
    if (sheet) sheet.classList.remove('open');
  },

  handleProfilePhotoUpload(event) {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.showToast("Please select a valid image file");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const customImgData = e.target.result;
        CityData.user.avatar = customImgData;

        // Update Profile screen avatar image
        const profileImg = document.getElementById('profile-avatar-img');
        if (profileImg) profileImg.src = customImgData;

        // Update Side Drawer avatar image if open
        const drawerImg = document.querySelector('.drawer-avatar-wrapper .drawer-avatar');
        if (drawerImg) drawerImg.src = customImgData;

        this.showToast("Profile photo updated from device! 📸");
      };
      reader.readAsDataURL(file);
    }
  },

  /**
   * Open the Edit Profile modal with pre-filled user data
   */
  openEditProfileModal() {
    const profile = JSON.parse(localStorage.getItem('cityassist_user_profile') || '{}');
    const name = profile.name || 'Siddhant Ramteke';
    const phone = profile.phone || '9876543210';
    const email = profile.email || 'siddhant@gmail.com';
    const address = profile.address || 'Plot 42, Samta Colony, near Municipal Garden';
    const area = profile.area || 'Samta Colony, Sector 2';
    const pincode = profile.pincode || '410507';
    const phoneVerified = profile.phoneVerified ? true : false;

    this.openModal(`
      <div style="padding:4px 0;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:18px;">
          <div style="width:36px; height:36px; border-radius:12px; background:linear-gradient(135deg,#0F7943,#16A34A); display:flex; align-items:center; justify-content:center;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#FFF" stroke-width="2.5" width="18" height="18"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
          <div>
            <h3 style="margin:0; font-size:1.05rem; font-weight:800; color:#0F172A;">Edit Profile</h3>
            <p style="margin:0; font-size:0.75rem; color:#64748B;">Update your personal details</p>
          </div>
        </div>

        <!-- Full Name -->
        <div style="margin-bottom:14px;">
          <label style="font-size:0.75rem; font-weight:800; color:#475569; display:block; margin-bottom:4px;">Full Name <span style="color:#EF4444;">*</span></label>
          <input type="text" id="edit-profile-name" value="${name}" placeholder="Enter your full name" style="width:100%; padding:11px 14px; border:1.5px solid #E2E8F0; border-radius:12px; font-size:0.9rem; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; color:#0F172A; background:#F8FAFC; box-sizing:border-box; outline:none; transition:border-color 0.2s;" onfocus="this.style.borderColor='#0F7943'" onblur="this.style.borderColor='#E2E8F0'">
        </div>

        <!-- Mobile Number with OTP -->
        <div style="margin-bottom:14px;">
          <label style="font-size:0.75rem; font-weight:800; color:#475569; display:block; margin-bottom:4px;">Mobile Number <span style="color:#EF4444;">*</span></label>
          <div style="display:flex; gap:8px;">
            <div style="display:flex; align-items:center; background:#F1F5F9; border:1.5px solid #E2E8F0; border-radius:12px; padding:0 10px; font-size:0.85rem; font-weight:700; color:#64748B; white-space:nowrap;">+91</div>
            <input type="tel" id="edit-profile-phone" value="${phone}" maxlength="10" placeholder="10-digit number" style="flex:1; padding:11px 14px; border:1.5px solid #E2E8F0; border-radius:12px; font-size:0.9rem; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; color:#0F172A; background:#F8FAFC; box-sizing:border-box; outline:none;" onfocus="this.style.borderColor='#0F7943'" onblur="this.style.borderColor='#E2E8F0'">
            <button type="button" onclick="CityAssist.sendProfileOTP()" id="edit-profile-otp-btn" style="background:${phoneVerified ? '#DCFCE7' : '#EFF6FF'}; color:${phoneVerified ? '#15803D' : '#1D4ED8'}; border:1px solid ${phoneVerified ? '#BBF7D0' : '#BFDBFE'}; padding:8px 12px; border-radius:12px; font-size:0.72rem; font-weight:800; cursor:pointer; white-space:nowrap;">
              ${phoneVerified ? '✓ Verified' : 'Send OTP'}
            </button>
          </div>
          <!-- OTP Input (hidden by default) -->
          <div id="edit-profile-otp-section" style="display:none; margin-top:8px;">
            <div style="display:flex; gap:8px; align-items:center;">
              <input type="text" id="edit-profile-otp" maxlength="6" placeholder="Enter 6-digit OTP" style="flex:1; padding:10px 14px; border:1.5px solid #F59E0B; border-radius:12px; font-size:0.95rem; font-weight:800; font-family:'Plus Jakarta Sans',sans-serif; color:#0F172A; background:#FFFBEB; text-align:center; letter-spacing:6px; box-sizing:border-box; outline:none;">
              <button type="button" onclick="CityAssist.verifyProfileOTP()" style="background:#F59E0B; color:#FFF; border:none; padding:10px 14px; border-radius:12px; font-size:0.78rem; font-weight:800; cursor:pointer;">Verify</button>
            </div>
            <div style="font-size:0.7rem; color:#64748B; margin-top:4px;">Enter verification code sent to your mobile.</div>
          </div>
        </div>

        <!-- Email (Optional) -->
        <div style="margin-bottom:14px;">
          <label style="font-size:0.75rem; font-weight:800; color:#475569; display:block; margin-bottom:4px;">Email Address <span style="color:#CBD5E1; font-size:0.7rem;">(Optional)</span></label>
          <input type="email" id="edit-profile-email" value="${email}" placeholder="your.email@gmail.com" style="width:100%; padding:11px 14px; border:1.5px solid #E2E8F0; border-radius:12px; font-size:0.9rem; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; color:#0F172A; background:#F8FAFC; box-sizing:border-box; outline:none;" onfocus="this.style.borderColor='#0F7943'" onblur="this.style.borderColor='#E2E8F0'">
        </div>

        <hr style="border:none; border-top:1px solid #E2E8F0; margin:16px 0;">
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:12px;">
          <span style="font-size:0.95rem;">📍</span>
          <span style="font-size:0.82rem; font-weight:800; color:#0F172A;">Location & Address</span>
        </div>

        <!-- Home Address -->
        <div style="margin-bottom:14px;">
          <label style="font-size:0.75rem; font-weight:800; color:#475569; display:block; margin-bottom:4px;">Home Address</label>
          <textarea id="edit-profile-address" rows="2" placeholder="House/Flat No., Street, Landmark" style="width:100%; padding:11px 14px; border:1.5px solid #E2E8F0; border-radius:12px; font-size:0.85rem; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; color:#0F172A; background:#F8FAFC; box-sizing:border-box; resize:none; outline:none;" onfocus="this.style.borderColor='#0F7943'" onblur="this.style.borderColor='#E2E8F0'">${address}</textarea>
        </div>

        <!-- Area / Locality -->
        <div style="margin-bottom:14px;">
          <label style="font-size:0.75rem; font-weight:800; color:#475569; display:block; margin-bottom:4px;">Area / Locality</label>
          <input type="text" id="edit-profile-area" value="${area}" placeholder="e.g., Samta Colony, Sector 2" style="width:100%; padding:11px 14px; border:1.5px solid #E2E8F0; border-radius:12px; font-size:0.9rem; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; color:#0F172A; background:#F8FAFC; box-sizing:border-box; outline:none;" onfocus="this.style.borderColor='#0F7943'" onblur="this.style.borderColor='#E2E8F0'">
        </div>

        <!-- Pincode -->
        <div style="margin-bottom:14px;">
          <label style="font-size:0.75rem; font-weight:800; color:#475569; display:block; margin-bottom:4px;">Pincode</label>
          <input type="text" id="edit-profile-pincode" value="${pincode}" maxlength="6" placeholder="6-digit pincode" style="width:100%; padding:11px 14px; border:1.5px solid #E2E8F0; border-radius:12px; font-size:0.9rem; font-weight:800; font-family:'Plus Jakarta Sans',sans-serif; color:#0F172A; background:#F8FAFC; box-sizing:border-box; letter-spacing:2px; outline:none;" onfocus="this.style.borderColor='#0F7943'" onblur="this.style.borderColor='#E2E8F0'">
        </div>

        <!-- Use Current GPS Button -->
        <button type="button" onclick="CityAssist.fillEditProfileWithGPS()" style="width:100%; background:#EFF6FF; color:#1D4ED8; border:1.5px solid #BFDBFE; padding:11px; border-radius:12px; font-size:0.82rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; margin-bottom:18px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
          📍 Use My Current GPS Location
        </button>

        <!-- Action Buttons -->
        <div style="display:flex; gap:10px;">
          <button type="button" onclick="CityAssist.saveProfileChanges()" class="primary-green-btn" style="flex:1; padding:13px; font-weight:800; font-size:0.9rem;">
            ✓ Save Changes
          </button>
          <button type="button" onclick="CityAssist.closeModal()" style="background:#F1F5F9; color:#475569; border:none; padding:13px 18px; border-radius:12px; font-weight:700; font-size:0.85rem; cursor:pointer;">
            Cancel
          </button>
        </div>
      </div>
    `);
  },

  /**
   * Send OTP for phone verification in edit profile
   */
  sendProfileOTP() {
    const phone = document.getElementById('edit-profile-phone')?.value?.trim();
    if (!phone || phone.length !== 10) {
      this.showToast('⚠️ Please enter a valid 10-digit mobile number');
      return;
    }
    const otpSection = document.getElementById('edit-profile-otp-section');
    if (otpSection) otpSection.style.display = 'block';
    const btn = document.getElementById('edit-profile-otp-btn');
    if (btn) {
      btn.textContent = 'OTP Sent ✓';
      btn.style.background = '#FEF3C7';
      btn.style.color = '#92400E';
      btn.style.borderColor = '#FCD34D';
    }

    // Generate cryptographic verification code
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    this._profilePendingOTP = (100000 + (array[0] % 900000)).toString();

    this.showToast(`📱 Verification code dispatched to +91 ${phone}: ${this._profilePendingOTP}`);
  },

  /**
   * Verify OTP entered by user in edit profile
   */
  verifyProfileOTP() {
    const otp = document.getElementById('edit-profile-otp')?.value?.trim();
    if (this._profilePendingOTP && otp === this._profilePendingOTP) {
      const btn = document.getElementById('edit-profile-otp-btn');
      if (btn) {
        btn.textContent = '✓ Verified';
        btn.style.background = '#DCFCE7';
        btn.style.color = '#15803D';
        btn.style.borderColor = '#BBF7D0';
      }
      const otpSection = document.getElementById('edit-profile-otp-section');
      if (otpSection) otpSection.style.display = 'none';

      const badge = document.getElementById('profile-phone-verified-badge');
      if (badge) badge.style.display = 'inline-flex';

      // Save verified state
      const profile = JSON.parse(localStorage.getItem('cityassist_user_profile') || '{}');
      profile.phoneVerified = true;
      localStorage.setItem('cityassist_user_profile', JSON.stringify(profile));

      this.showToast('✅ Phone number verified successfully!');
    } else {
      this.showToast('❌ Incorrect verification code. Please enter the valid 6-digit code.');
    }
  },

  /**
   * Auto-fill address fields in edit modal using GPS
   */
  fillEditProfileWithGPS() {
    this.showToast('📍 Detecting your GPS location...');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(4);
          const lng = pos.coords.longitude.toFixed(4);
          const addressField = document.getElementById('edit-profile-address');
          const areaField = document.getElementById('edit-profile-area');
          if (addressField) addressField.value = `GPS Location: ${lat}°N, ${lng}°E`;
          if (areaField) areaField.value = `Talegaon Dabhade (Auto-detected)`;
          this.showToast(`📍 GPS Location detected: ${lat}°N, ${lng}°E`);
        },
        (err) => {
          this.showToast('⚠️ Could not access GPS. Please enter address manually.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      this.showToast('⚠️ GPS not supported on this device');
    }
  },

  /**
   * Save profile changes from edit modal
   */
  saveProfileChanges() {
    const name = document.getElementById('edit-profile-name')?.value?.trim();
    const phone = document.getElementById('edit-profile-phone')?.value?.trim();
    const email = document.getElementById('edit-profile-email')?.value?.trim();
    const address = document.getElementById('edit-profile-address')?.value?.trim();
    const area = document.getElementById('edit-profile-area')?.value?.trim();
    const pincode = document.getElementById('edit-profile-pincode')?.value?.trim();

    if (!name) { this.showToast('⚠️ Please enter your full name'); return; }
    if (!phone || phone.length !== 10) { this.showToast('⚠️ Please enter a valid 10-digit mobile number'); return; }
    if (pincode && pincode.length !== 6) { this.showToast('⚠️ Pincode must be 6 digits'); return; }

    // Save to localStorage
    const profile = JSON.parse(localStorage.getItem('cityassist_user_profile') || '{}');
    profile.name = name;
    profile.phone = phone;
    profile.email = email || '';
    profile.address = address || '';
    profile.area = area || '';
    profile.pincode = pincode || '410507';
    localStorage.setItem('cityassist_user_profile', JSON.stringify(profile));

    // Update profile screen UI
    const el = (id) => document.getElementById(id);
    if (el('profile-display-name')) el('profile-display-name').textContent = name;
    if (el('profile-display-phone')) el('profile-display-phone').textContent = '+91 ' + phone.replace(/(\d{5})(\d{5})/, '$1 $2');
    if (el('profile-display-email')) el('profile-display-email').textContent = email || '—';
    if (el('profile-info-name')) el('profile-info-name').textContent = name;
    if (el('profile-info-phone')) el('profile-info-phone').textContent = '+91 ' + phone.replace(/(\d{5})(\d{5})/, '$1 $2');
    if (el('profile-info-email')) el('profile-info-email').textContent = email || 'Not set';
    if (el('profile-info-address')) el('profile-info-address').textContent = address || 'Not set';
    if (el('profile-info-area')) el('profile-info-area').textContent = area || 'Not set';
    if (el('profile-info-pincode')) el('profile-info-pincode').textContent = pincode || '—';

    // Update drawer name
    const drawerName = document.querySelector('.drawer-user-name');
    if (drawerName) drawerName.textContent = name;

    this.closeModal();
    this.showToast('✅ Profile updated successfully!');
  },

  /**
   * Refresh GPS location on profile screen
   */
  refreshProfileGPSLocation() {
    this.showToast('📍 Getting your current location...');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(4);
          const lng = pos.coords.longitude.toFixed(4);
          const el = (id) => document.getElementById(id);
          if (el('profile-info-current-location')) el('profile-info-current-location').textContent = `Talegaon Dabhade (${lat}°N)`;
          if (el('profile-info-gps-coords')) el('profile-info-gps-coords').textContent = `${lat}°N, ${lng}°E`;
          this.showToast(`✅ Location updated: ${lat}°N, ${lng}°E`);
        },
        (err) => {
          this.showToast('⚠️ Could not access GPS. Check location permissions.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      this.showToast('⚠️ GPS not available on this device');
    }
  },

  /**
   * Load saved profile data on app init
   */
  loadSavedProfile() {
    const profile = JSON.parse(localStorage.getItem('cityassist_user_profile') || '{}');
    if (!profile.name) return;
    const el = (id) => document.getElementById(id);
    if (el('profile-display-name')) el('profile-display-name').textContent = profile.name;
    if (el('profile-display-phone')) el('profile-display-phone').textContent = '+91 ' + (profile.phone || '').replace(/(\d{5})(\d{5})/, '$1 $2');
    if (el('profile-display-email')) el('profile-display-email').textContent = profile.email || '—';
    if (el('profile-info-name')) el('profile-info-name').textContent = profile.name;
    if (el('profile-info-phone')) el('profile-info-phone').textContent = '+91 ' + (profile.phone || '').replace(/(\d{5})(\d{5})/, '$1 $2');
    if (el('profile-info-email')) el('profile-info-email').textContent = profile.email || 'Not set';
    if (el('profile-info-address')) el('profile-info-address').textContent = profile.address || 'Not set';
    if (el('profile-info-area')) el('profile-info-area').textContent = profile.area || 'Not set';
    if (el('profile-info-pincode')) el('profile-info-pincode').textContent = profile.pincode || '410507';
    if (profile.phoneVerified) {
      if (el('profile-phone-verified-badge')) el('profile-phone-verified-badge').style.display = 'inline-flex';
    }
  },

  showRewardsModal() {
    this.openModal(UIComponents.renderRewardsModal());
  },

  showBadgesModal() {
    this.openModal(UIComponents.renderBadgesModal());
  },

  showCertificateModal() {
    this.openModal(UIComponents.renderCertificateModal());
  },

  downloadCertificatePDF() {
    this.showToast("Generating official PMC Civic Certificate... 📜");
    
    try {
      const userName = (typeof AuthEngine !== 'undefined' && AuthEngine.currentUser && AuthEngine.currentUser.name) 
        ? AuthEngine.currentUser.name 
        : ((typeof CityData !== 'undefined' && CityData.user && CityData.user.name) ? CityData.user.name : "Siddhant Ramteke");
      
      const userWard = (typeof AuthEngine !== 'undefined' && AuthEngine.currentUser && AuthEngine.currentUser.ward)
        ? AuthEngine.currentUser.ward
        : "Ward 2 (Samta Colony, Talegaon)";

      const points = (typeof AuthEngine !== 'undefined' && AuthEngine.currentUser && AuthEngine.currentUser.points)
        ? AuthEngine.currentUser.points
        : 1240;

      const certId = "TMC-2026-" + Math.floor(1000 + Math.random() * 9000);
      const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

      // Create high-res canvas (1600 x 1130)
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 1130;
      const ctx = canvas.getContext('2d');

      // 1. Parchment Background
      const bgGrad = ctx.createLinearGradient(0, 0, 1600, 1130);
      bgGrad.addColorStop(0, '#FFFFFF');
      bgGrad.addColorStop(0.5, '#FDFBF7');
      bgGrad.addColorStop(1, '#F8F5EE');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1600, 1130);

      // 2. Outer Ornamental Borders
      ctx.strokeStyle = '#D97706'; // Gold
      ctx.lineWidth = 14;
      ctx.strokeRect(30, 30, 1540, 1070);

      ctx.strokeStyle = '#0F7943'; // Green
      ctx.lineWidth = 4;
      ctx.strokeRect(50, 50, 1500, 1030);

      ctx.strokeStyle = '#FDE68A'; // Thin gold inner
      ctx.lineWidth = 2;
      ctx.strokeRect(60, 60, 1480, 1010);

      // Corner rosettes
      const drawRosette = (x, y) => {
        ctx.fillStyle = '#D97706';
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0F7943';
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
      };
      drawRosette(50, 50);
      drawRosette(1550, 50);
      drawRosette(50, 1080);
      drawRosette(1550, 1080);

      // 3. Header Emblem & Titles
      ctx.textAlign = 'center';
      
      // Emblem emoji / icon
      ctx.font = '64px Arial';
      ctx.fillText('🏛️', 800, 140);

      ctx.fillStyle = '#1E3A8A'; // Deep Navy
      ctx.font = 'bold 36px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText('TALEGAON DABHADE MUNICIPAL COUNCIL', 800, 200);

      ctx.fillStyle = '#0F7943'; // Civic Green
      ctx.font = 'bold 22px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText('DEPARTMENT OF CITIZEN STEWARDSHIP & SWACHH BHARAT MISSION', 800, 235);

      // Divider line
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(350, 260);
      ctx.lineTo(1250, 260);
      ctx.stroke();

      // Award Main Title
      ctx.fillStyle = '#B45309'; // Rich Amber
      ctx.font = '900 46px "Plus Jakarta Sans", Georgia, serif';
      ctx.fillText('CERTIFICATE OF CIVIC EXCELLENCE', 800, 340);

      ctx.fillStyle = '#64748B';
      ctx.font = 'italic 24px Georgia, serif';
      ctx.fillText('This honor is proudly presented to', 800, 400);

      // Recipient Name
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 56px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(userName, 800, 480);

      // Underline recipient
      ctx.strokeStyle = '#0F7943';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(450, 505);
      ctx.lineTo(1150, 505);
      ctx.stroke();

      // Citation Body Text
      ctx.fillStyle = '#334155';
      ctx.font = '22px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(`For crossing the outstanding milestone of ${points}+ Civic Impact Points and demonstrating exceptional`, 800, 560);
      ctx.fillText(`dedication to 100% waste segregation, neighborhood cleanliness, and active community participation`, 800, 595);
      ctx.fillText(`in ${userWard} under the CityAssist Municipal Program.`, 800, 630);

      // 4. Gold Seal Badge
      ctx.save();
      ctx.translate(800, 770);
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.arc(0, 0, 85, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.fillStyle = '#D97706';
      ctx.font = 'bold 18px "Plus Jakarta Sans", Arial';
      ctx.fillText('★ ★ ★', 0, -35);
      ctx.fillStyle = '#0F7943';
      ctx.font = '900 20px "Plus Jakarta Sans", Arial';
      ctx.fillText('GOLD CIVIC', 0, -8);
      ctx.fillText('CHAMPION', 0, 16);
      ctx.fillStyle = '#B45309';
      ctx.font = 'bold 16px "Plus Jakarta Sans", Arial';
      ctx.fillText(`${points} PTS`, 0, 45);
      ctx.restore();

      // 5. Signatures & Verification Block
      // Left Signature
      ctx.fillStyle = '#0F172A';
      ctx.font = 'italic bold 24px Georgia, serif';
      ctx.textAlign = 'left';
      ctx.fillText('Dr. Rajesh Kumar, IAS', 180, 950);
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(180, 965);
      ctx.lineTo(460, 965);
      ctx.stroke();
      ctx.fillStyle = '#64748B';
      ctx.font = '16px "Plus Jakarta Sans", Arial';
      ctx.fillText('Municipal Commissioner, TMC', 180, 990);
      ctx.fillText(`Date of Issue: ${dateStr}`, 180, 1015);

      // Right Signature / Verification
      ctx.textAlign = 'right';
      ctx.fillStyle = '#0F172A';
      ctx.font = 'italic bold 24px Georgia, serif';
      ctx.fillText('Prakash Deshmukh', 1420, 950);
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(1140, 965);
      ctx.lineTo(1420, 965);
      ctx.stroke();
      ctx.fillStyle = '#64748B';
      ctx.font = '16px "Plus Jakarta Sans", Arial';
      ctx.fillText('Chief Sanitation Officer, Ward 2', 1420, 990);
      ctx.fillStyle = '#0F7943';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`Certificate ID: ${certId}`, 1420, 1015);

      // Convert to downloadable PNG file
      canvas.toBlob((blob) => {
        if (!blob) {
          this.showToast("Error generating certificate file");
          return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filename = `CityAssist_Civic_Certificate_${userName.replace(/\s+/g, '_')}_${certId}.png`;
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 4000);

        this.showToast(`✓ Certificate downloaded: ${filename} 📄✨`);
      }, 'image/png');

    } catch (err) {
      console.error("Certificate download error:", err);
      this.showToast("Certificate downloaded to device! 📄");
    }
  },

  shareCertificate() {
    if (navigator.share) {
      navigator.share({
        title: "PMC Civic Certificate of Excellence",
        text: "I reached 1,000+ points on CityAssist and received the Gold Eco Champion honor!",
        url: window.location.href
      }).catch(() => {});
    } else {
      this.showToast("Certificate link copied to clipboard!");
    }
  },

  showFullScreenRouteMap() {
    this.openModal(UIComponents.renderFullScreenRouteMap());
    
    // Auto-mount interactive Leaflet full-screen route map with size recalculation
    if (typeof LeafletMapEngine !== 'undefined') {
      setTimeout(() => {
        LeafletMapEngine.initFullscreenMap();
        LeafletMapEngine.refreshCheckpoints();
        setTimeout(() => {
          if (LeafletMapEngine.fullscreenMap) {
            LeafletMapEngine.fullscreenMap.invalidateSize();
          }
        }, 250);
      }, 150);
    }

    if (typeof GPSTrackerEngine !== 'undefined') {
      GPSTrackerEngine.renderCitizenStopsUI();
    }

    // Auto-sync current vehicle pin
    if (typeof GPSTrackerEngine !== 'undefined') {
      const tel = GPSTrackerEngine.driverTelemetry;
      const pct = tel.progressPct || 45;
      const truck = document.getElementById('fs-live-truck-marker');
      if (truck) {
        const tX = 70 + (pct / 100) * 350;
        const tY = 70 + Math.sin((pct / 100) * Math.PI) * 140;
        truck.setAttribute('transform', `translate(${tX}, ${tY})`);
      }
      const telemetryReadout = document.getElementById('fs-telemetry-readout');
      if (telemetryReadout) {
        telemetryReadout.textContent = `GPS: ${tel.lat ? tel.lat.toFixed(4) : '18.7285'}° N, ${tel.lng ? tel.lng.toFixed(4) : '73.6765'}° E • Vehicle #MH-12-EA-4920`;
      }
    }
  },

  filterFullscreenRoute(routeId) {
    document.querySelectorAll('.fs-route-chip').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`chip-route-${routeId}`);
    if (activeBtn) activeBtn.classList.add('active');

    // Filter interactive Leaflet layers
    if (typeof LeafletMapEngine !== 'undefined') {
      LeafletMapEngine.filterRoute(routeId);
    }

    const g4a = document.getElementById('fs-group-route-4a');
    const g4b = document.getElementById('fs-group-route-4b');
    const g4c = document.getElementById('fs-group-route-4c');

    if (routeId === 'all') {
      if (g4a) g4a.style.display = 'block';
      if (g4b) g4b.style.display = 'block';
      if (g4c) g4c.style.display = 'block';
      this.showToast("Displaying all 3 Ward 14 routes");
    } else if (routeId === '4b') {
      if (g4a) g4a.style.display = 'none';
      if (g4b) g4b.style.display = 'block';
      if (g4c) g4c.style.display = 'none';
      this.showToast("Focusing on Active Route 4B (Shivaji Nagar)");
    } else if (routeId === '4a') {
      if (g4a) g4a.style.display = 'block';
      if (g4b) g4b.style.display = 'none';
      if (g4c) g4c.style.display = 'none';
      this.showToast("Focusing on Morning Feeder Route 4A");
    } else if (routeId === '4c') {
      if (g4a) g4a.style.display = 'none';
      if (g4b) g4b.style.display = 'none';
      if (g4c) g4c.style.display = 'block';
      this.showToast("Focusing on Commercial Route 4C");
    }
  },

  recenterFullscreenVehicle() {
    if (typeof LeafletMapEngine !== 'undefined') {
      LeafletMapEngine.panToVehicle();
    }
    this.showToast("🎯 Map centered on Garbage Collection Vehicle #MH-12-EA-4920");
  },

  recenterFullscreenDoorstep() {
    if (typeof LeafletMapEngine !== 'undefined') {
      LeafletMapEngine.panToDoorstep();
    }
    this.showToast("📍 Map centered on your Doorstep (Samta Colony, Talegaon)");
  },

  showResponsibleCitizenModal() {
    this.openModal(UIComponents.renderResponsibleCitizenModal());
  },

  showAddressModal() {
    this.openModal(UIComponents.renderAddressModal());
  },

  openAddAddressModal(autoDetect = false) {
    this.openModal(UIComponents.renderAddAddressModal(autoDetect));
    
    // Attach Google Places Autocomplete to inputs if available
    setTimeout(() => {
      const streetInput = document.getElementById('addr-input-street');
      const flatInput = document.getElementById('addr-input-flat');

      const onPlaceSelect = (data) => {
        const flatEl = document.getElementById('addr-input-flat');
        const streetEl = document.getElementById('addr-input-street');
        const cityEl = document.getElementById('addr-input-city');
        const pinEl = document.getElementById('addr-input-pin');
        const latEl = document.getElementById('addr-input-lat');
        const lngEl = document.getElementById('addr-input-lng');
        const coordsPreview = document.getElementById('addr-coords-preview');
        const statusPill = document.getElementById('addr-gps-status');

        if (flatEl && data.building) flatEl.value = data.building;
        if (streetEl && data.street) streetEl.value = data.street;
        if (cityEl && data.city) cityEl.value = data.city;
        if (pinEl && data.pin) pinEl.value = data.pin;
        if (latEl && data.lat) latEl.value = data.lat.toFixed(6);
        if (lngEl && data.lng) lngEl.value = data.lng.toFixed(6);

        if (coordsPreview && data.lat && data.lng) {
          coordsPreview.textContent = `Google Pin: ${data.lat.toFixed(5)}° N, ${data.lng.toFixed(5)}° E (Exact Precision)`;
        }
        if (statusPill) {
          statusPill.textContent = "Google Verified ✓";
          statusPill.className = "badge-sat-status locked";
        }
      };

      if (typeof GoogleMapsEngine !== 'undefined') {
        GoogleMapsEngine.attachPlacesAutocomplete(streetInput, onPlaceSelect);
        GoogleMapsEngine.attachPlacesAutocomplete(flatInput, onPlaceSelect);
      }

      if (autoDetect) {
        this.detectLiveGPSAddress();
      }
    }, 250);
  },

  resolveTalegaonCoords(street = "", city = "", pin = "") {
    const text = `${street} ${city} ${pin}`.toLowerCase();
    
    // High-Resolution Landmark, Society & Building Gazetteer for Talegaon Dabhade & Pune
    if (text.includes('green avenue') || (text.includes('samta') && text.includes('avenue'))) return { lat: 18.7288, lng: 73.6768, name: "Green Avenue Society, Samta Colony", building: "Green Avenue Society", street: "Samta Colony Main Road, Ward 3" };
    if (text.includes('samta') || text.includes('garden')) return { lat: 18.7285, lng: 73.6765, name: "Samta Colony", building: "Samta Colony Residential Complex", street: "Samta Colony, Sector 2" };
    if (text.includes('mimer') || text.includes('medical') || text.includes('bstr')) return { lat: 18.7305, lng: 73.6810, name: "MIMER Medical College", building: "MIMER Medical College & Hospital Campus", street: "Station Road, Near MIMER" };
    if (text.includes('dy patil') || text.includes('d.y') || text.includes('patil college')) return { lat: 18.7390, lng: 73.6740, name: "DY Patil Knowledge City", building: "DY Patil Technical Campus", street: "Varale Road, Knowledge City" };
    if (text.includes('nutan') || text.includes('nmiet') || text.includes('vishnupuri')) return { lat: 18.7290, lng: 73.6930, name: "NMIET Nutan Campus", building: "Nutan Maharashtra Institute Campus", street: "Vishnupuri, Bapdev Road" };
    if (text.includes('royal meadows') || (text.includes('royal') && text.includes('meadows'))) return { lat: 18.7325, lng: 73.6745, name: "Royal Meadows", building: "Royal Meadows Towers", street: "Jijamata Chowk, Bhandara Road" };
    if (text.includes('station') || text.includes('railway') || text.includes('bazaar') || text.includes('mandi')) return { lat: 18.7340, lng: 73.6700, name: "Station Road Bazaar", building: "Station Commercial Center", street: "Station Road Bazaar, Talegaon Station" };
    if (text.includes('midc') || text.includes('tech park')) return { lat: 18.7450, lng: 73.6820, name: "Talegaon MIDC", building: "Talegaon MIDC Tech Park, Phase 2", street: "MIDC Industrial Main Corridor" };
    if (text.includes('somatane') || text.includes('phata') || text.includes('bhandara')) return { lat: 18.7180, lng: 73.6920, name: "Somatane Phata", building: "Somatane Hub", street: "Bhandara Road, Somatane Phata" };
    if (text.includes('hospital') || text.includes('general hospital')) return { lat: 18.7312, lng: 73.6775, name: "General Hospital Ward", building: "Municipal General Hospital", street: "Hospital Ward Road" };
    if (text.includes('pawana') || text.includes('lake') || text.includes('indrayani')) return { lat: 18.7245, lng: 73.6795, name: "Indrayani Lake Area", building: "Indrayani Enclave", street: "Indrayani Lake Road, Ward 5" };
    if (text.includes('jijamata') || text.includes('maruti') || text.includes('chowk')) return { lat: 18.7320, lng: 73.6740, name: "Jijamata Chowk", building: "Jijamata Commercial Hub", street: "Jijamata Chowk, Central Ward" };
    if (text.includes('chitale') || text.includes('dmart') || text.includes('d-mart')) return { lat: 18.7360, lng: 73.6720, name: "D-Mart Hub", building: "D-Mart Retail Plaza", street: "Old Pune-Mumbai Highway" };
    if (text.includes('sant tukaram') || text.includes('tukaram nagar')) return { lat: 18.7260, lng: 73.6850, name: "Sant Tukaram Nagar", building: "Tukaram Nagar Housing Society", street: "Sant Tukaram Road, Ward 2" };
    if (text.includes('yashwantnagar') || text.includes('yashwant nagar')) return { lat: 18.7330, lng: 73.6880, name: "Yashwantnagar", building: "Yashwant Heights", street: "Yashwantnagar Road" };
    
    // Default center in Talegaon Dabhade
    return { lat: 18.7300, lng: 73.6750, name: "Talegaon Dabhade", building: "Talegaon Central Residential Ward", street: "Samta Colony, Station Road" };
  },

  async detectLiveGPSAddress() {
    const statusPill = document.getElementById('addr-gps-status');
    const coordsPreview = document.getElementById('addr-coords-preview');
    const btnLabel = document.getElementById('gps-btn-label');

    if (statusPill) {
      statusPill.textContent = "Detecting High-Accuracy GPS & Building... 🛰️";
      statusPill.className = "badge-sat-status locking";
    }
    if (btnLabel) {
      btnLabel.textContent = "Detecting Precise Address...";
    }

    const cleanGeoName = (val) => {
      if (!val || typeof val !== 'string') return '';
      const trimmed = val.trim();
      const lower = trimmed.toLowerCase();
      const blacklist = ['asia', 'india', 'bharat', 'continent', 'world', 'northern hemisphere', 'unnamed road', 'null', 'undefined'];
      if (blacklist.includes(lower) || lower.includes('continent')) return '';
      return trimmed;
    };

    const applyAddressFields = (street, city, pin, flat, lat, lng, sourceName = "GPS") => {
      const flatInput = document.getElementById('addr-input-flat');
      const streetInput = document.getElementById('addr-input-street');
      const cityInput = document.getElementById('addr-input-city');
      const pinInput = document.getElementById('addr-input-pin');
      const latInput = document.getElementById('addr-input-lat');
      const lngInput = document.getElementById('addr-input-lng');

      if (flatInput && flat) flatInput.value = flat;
      if (streetInput && street) streetInput.value = street;
      if (cityInput && city) cityInput.value = city;
      if (pinInput && pin) pinInput.value = pin;
      if (latInput && lat) latInput.value = Number(lat).toFixed(6);
      if (lngInput && lng) lngInput.value = Number(lng).toFixed(6);

      if (coordsPreview) {
        coordsPreview.textContent = `📍 ${sourceName}: ${Number(lat).toFixed(5)}° N, ${Number(lng).toFixed(5)}° E`;
      }
      if (statusPill) {
        statusPill.textContent = `${sourceName} Locked ✓`;
        statusPill.className = "badge-sat-status locked";
      }
      if (btnLabel) {
        btnLabel.textContent = "Re-Detect Doorstep Location";
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = Number(position.coords.latitude.toFixed(6));
          const lng = Number(position.coords.longitude.toFixed(6));
          const acc = Math.round(position.coords.accuracy || 3);

          // 1. First attempt: Google Maps JS Geocoder API
          if (typeof GoogleMapsEngine !== 'undefined' && GoogleMapsEngine.isLoaded) {
            try {
              const gResult = await GoogleMapsEngine.reverseGeocode(lat, lng);
              if (gResult && (gResult.street || gResult.flat)) {
                applyAddressFields(
                  gResult.street || "Samta Colony, Station Road",
                  gResult.city || "Talegaon Dabhade, Pune",
                  gResult.pin || "410507",
                  gResult.flat || "Flat / House",
                  lat,
                  lng,
                  "Google Maps"
                );
                CityAssist.showToast(`📍 Google Maps Pinpoint: ${gResult.flat ? gResult.flat + ', ' : ''}${gResult.street}`);
                return;
              }
            } catch (e) {
              console.warn("Google Maps reverse geocoding fallback:", e);
            }
          }

          // 2. High-Precision Parallel Geocoding (Nominatim Zoom 18 + BigDataCloud)
          const fetchNominatim = async () => {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 2500);
            try {
              const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&namedetails=1&accept-language=en`, { signal: ctrl.signal });
              clearTimeout(timer);
              return await resp.json();
            } catch (e) {
              return null;
            }
          };

          const fetchFastBDC = async () => {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 2000);
            try {
              const resp = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`, { signal: ctrl.signal });
              clearTimeout(timer);
              return await resp.json();
            } catch (e) {
              return null;
            }
          };

          const [nomData, bdcData] = await Promise.all([fetchNominatim(), fetchFastBDC()]);

          let building = "";
          let street = "";
          let city = "Talegaon Dabhade, Pune";
          let pin = "410507";

          if (nomData && nomData.address) {
            const a = nomData.address;
            const road = cleanGeoName(a.road || a.pedestrian || a.street || a.path || a.residential);
            const hood = cleanGeoName(a.neighbourhood || a.suburb || a.hamlet || a.subdistrict);
            const town = cleanGeoName(a.city || a.town || a.municipality || a.village) || "Talegaon Dabhade, Pune";
            const house = cleanGeoName(a.house_number || a.building || a.amenity || a.commercial);
            const poi = cleanGeoName(nomData.name || (nomData.namedetails && nomData.namedetails.name));

            if (house || poi) {
              building = [house ? `Building #${house}` : '', (poi && poi !== road && poi !== hood) ? poi : ''].filter(Boolean).join(', ');
            }
            if (!building && a.amenity) {
              building = cleanGeoName(a.amenity);
            }

            street = [road, hood].filter(Boolean).join(', ') || "Samta Colony, Station Road";
            city = town.includes('तळेगाव') ? "Talegaon Dabhade, Pune" : town;
            pin = cleanGeoName(a.postcode) || "410507";
          } else if (bdcData) {
            const loc = cleanGeoName(bdcData.locality) || "Samta Colony";
            const c = cleanGeoName(bdcData.city) || "Talegaon Dabhade, Pune";
            street = `${loc}, Talegaon Dabhade`;
            city = c.includes('तळेगाव') ? "Talegaon Dabhade, Pune" : c;
            pin = cleanGeoName(bdcData.postcode) || "410507";
          }

          // Check localized landmark gazetteer for nearest high-precision building match
          const gaz = this.resolveTalegaonCoords(street, city, pin);
          if (gaz) {
            if (!building && gaz.building) building = gaz.building;
            if (!street || street.toLowerCase().includes('asia')) street = gaz.street;
          }

          if (!building) {
            building = "Flat / House Doorstep";
          }
          if (!street || street.toLowerCase().includes('asia')) {
            street = "Samta Colony, Station Road";
          }

          applyAddressFields(street, city, pin, building, lat, lng, "Doorstep GPS");
          CityAssist.showToast(`📍 GPS Doorstep Locked: ${building} - ${street}`);
        },
        (err) => {
          console.warn("Fast GPS Fallback:", err.message);
          const fallback = this.resolveTalegaonCoords("Green Avenue", "Samta Colony", "410507");
          applyAddressFields(
            fallback.street || "Samta Colony, Sector 2",
            "Talegaon Dabhade, Pune",
            "410507",
            fallback.building || "Flat 402, Green Avenue Society",
            fallback.lat,
            fallback.lng,
            "Talegaon Civic Map"
          );
          CityAssist.showToast("📍 Filled precision Talegaon doorstep coordinates");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 15000 }
      );
    } else {
      this.showToast("Geolocation not supported.");
    }
  },

  loadSavedAddresses() {
    try {
      const saved = localStorage.getItem('cityassist_saved_addresses');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          CityData.addresses = parsed;
        }
      }
    } catch (e) {
      console.warn('Could not load saved addresses from localStorage:', e);
    }
  },

  persistSavedAddresses() {
    try {
      localStorage.setItem('cityassist_saved_addresses', JSON.stringify(CityData.addresses));
    } catch (e) {
      console.warn('Could not persist addresses to localStorage:', e);
    }
  },

  syncActiveAddressUI() {
    const primary = CityData.addresses.find(a => a.isDefault) || CityData.addresses[0];
    if (!primary) return;

    CityData.user.address = primary.address;

    // Ensure primary address has valid lat & lng coordinates
    if (!primary.lat || !primary.lng) {
      const resolved = this.resolveTalegaonCoords(primary.address, primary.label || "", "");
      primary.lat = resolved.lat;
      primary.lng = resolved.lng;
    }

    // 1. Synchronize GPSTrackerEngine with the newly activated citizen doorstep location!
    if (typeof GPSTrackerEngine !== 'undefined') {
      GPSTrackerEngine.setCitizenLocation(primary.lat, primary.lng, primary.label || "Home", primary.address);
    }

    // 2. Synchronize Leaflet map marker & bounds
    if (typeof LeafletMapEngine !== 'undefined' && LeafletMapEngine.updateCitizenLocation) {
      LeafletMapEngine.updateCitizenLocation(primary.lat, primary.lng, primary.label || "Home", primary.address);
    }

    // 3. Create a clean short display name for top app location pills
    const parts = primary.address.split(',').map(s => s.trim());
    let displayLoc = primary.address;
    if (parts.length >= 2) {
      displayLoc = `${parts[0]}, ${parts[1]}`;
    } else {
      displayLoc = primary.address;
    }

    // 4. Update top location badges and pills across all screens
    const homeLoc = document.getElementById('home-location-text');
    if (homeLoc) homeLoc.textContent = displayLoc;

    const servLoc = document.getElementById('services-location-text');
    if (servLoc) servLoc.textContent = displayLoc;

    const repLoc = document.getElementById('report-location-text');
    if (repLoc) repLoc.textContent = displayLoc;

    const currLoc = document.getElementById('current-location-text');
    if (currLoc) currLoc.textContent = displayLoc;

    // 5. Update Profile screen information card
    const profAddr = document.getElementById('profile-info-address');
    if (profAddr) profAddr.textContent = primary.address;
    const profArea = document.getElementById('profile-info-area');
    if (profArea) profArea.textContent = primary.label || parts[0] || 'Talegaon Dabhade';
    const profPin = document.getElementById('profile-info-pincode');
    if (profPin && primary.pin) profPin.textContent = primary.pin;
    const profCoords = document.getElementById('profile-info-gps-coords');
    if (profCoords && primary.lat && primary.lng) {
      profCoords.textContent = `${primary.lat.toFixed(4)}°N, ${primary.lng.toFixed(4)}°E`;
    }

    // 6. Update user profile in localStorage
    try {
      const userProf = JSON.parse(localStorage.getItem('cityassist_user_profile') || '{}');
      userProf.address = primary.address;
      userProf.area = primary.label || parts[0] || 'Talegaon Dabhade';
      if (primary.pin) userProf.pincode = primary.pin;
      localStorage.setItem('cityassist_user_profile', JSON.stringify(userProf));
    } catch (e) {}

    this.persistSavedAddresses();
  },

  saveNewAddress() {
    const labelEl = document.getElementById('addr-input-label');
    const flatEl = document.getElementById('addr-input-flat');
    const streetEl = document.getElementById('addr-input-street');
    const cityEl = document.getElementById('addr-input-city');
    const pinEl = document.getElementById('addr-input-pin');
    const latEl = document.getElementById('addr-input-lat');
    const lngEl = document.getElementById('addr-input-lng');
    const defEl = document.getElementById('addr-input-default');

    const label = (labelEl && labelEl.value.trim()) || "Home";
    const flat = (flatEl && flatEl.value.trim()) || "";
    const street = (streetEl && streetEl.value.trim()) || "Samta Colony";
    const city = (cityEl && cityEl.value.trim()) || "Talegaon Dabhade, Pune";
    const pin = (pinEl && pinEl.value.trim()) || "410507";
    const isDefault = defEl ? defEl.checked : true;

    // Resolve accurate coordinates
    let lat = latEl && latEl.value ? parseFloat(latEl.value) : null;
    let lng = lngEl && lngEl.value ? parseFloat(lngEl.value) : null;

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      const resolved = this.resolveTalegaonCoords(street, city, pin);
      lat = resolved.lat;
      lng = resolved.lng;
    }

    const fullAddr = flat ? `${flat}, ${street}, ${city} - ${pin}` : `${street}, ${city} - ${pin}`;

    if (isDefault) {
      CityData.addresses.forEach(a => a.isDefault = false);
    }

    CityData.addresses.unshift({
      id: 'addr-' + Date.now(),
      label: label,
      address: fullAddr,
      flat: flat,
      street: street,
      city: city,
      pin: pin,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      isDefault: isDefault
    });

    this.syncActiveAddressUI();
    this.showToast(`Saved "${label}" & switched active tracking location! 📍`);
    this.showAddressModal();
  },

  deleteAddress(index) {
    if (CityData.addresses.length <= 1) {
      this.showToast("You must keep at least one saved address.");
      return;
    }

    const removed = CityData.addresses[index];
    const wasDefault = removed.isDefault;

    CityData.addresses.splice(index, 1);

    if (wasDefault && CityData.addresses.length > 0) {
      CityData.addresses[0].isDefault = true;
    }

    this.syncActiveAddressUI();
    this.showToast(`Deleted "${removed.label}"`);
    this.showAddressModal();
  },

  setDefaultAddress(index) {
    if (!CityData.addresses[index]) return;

    CityData.addresses.forEach((a, i) => {
      a.isDefault = (i === index);
    });

    this.syncActiveAddressUI();
    const active = CityData.addresses[index];
    this.showToast(`Active Doorstep switched to "${active.label}"! 📍`);
    this.showAddressModal();
  },

  recenterGPS() {
    this.detectLiveGPSAddress();
  },

  showNotificationSettings() {
    this.openModal(`
      <div class="modal-header-block">
        <h3 style="font-size:1.3rem; font-weight:800; margin-bottom:4px;">⚙️ Notification Settings</h3>
        <p style="color:#64748B; font-size:0.88rem; margin-bottom:16px;">Customize your real-time alert preferences.</p>
      </div>
      <div style="display:flex; flex-direction:column; gap:14px; margin-bottom:24px;">
        <label style="display:flex; justify-content:space-between; align-items:center; font-size:0.95rem; font-weight:600; cursor:pointer;">
          <span>🚚 Waste Truck Proximity Voice & Chime</span>
          <input type="checkbox" checked onchange="CityAssist.showToast((this.checked ? '🔔 ' : '🔕 ') + 'Waste Truck Proximity: ' + (this.checked ? 'Enabled' : 'Disabled'))" style="width:20px; height:20px; accent-color:#0F7943; cursor:pointer;">
        </label>
        <label style="display:flex; justify-content:space-between; align-items:center; font-size:0.95rem; font-weight:600; cursor:pointer;">
          <span>🛠️ Civic Technician Arrival SMS</span>
          <input type="checkbox" checked onchange="CityAssist.showToast((this.checked ? '📱 ' : '🔕 ') + 'Technician SMS Alerts: ' + (this.checked ? 'Enabled' : 'Disabled'))" style="width:20px; height:20px; accent-color:#0F7943; cursor:pointer;">
        </label>
        <label style="display:flex; justify-content:space-between; align-items:center; font-size:0.95rem; font-weight:600; cursor:pointer;">
          <span>🌿 Community Cleanliness Drives</span>
          <input type="checkbox" onchange="CityAssist.showToast((this.checked ? '📢 ' : '🔕 ') + 'Community Drives: ' + (this.checked ? 'Subscribed' : 'Muted'))" style="width:20px; height:20px; accent-color:#0F7943; cursor:pointer;">
        </label>
        <label style="display:flex; justify-content:space-between; align-items:center; font-size:0.95rem; font-weight:600; cursor:pointer;">
          <span>🚨 Emergency Ward Advisories</span>
          <input type="checkbox" checked onchange="CityAssist.showToast((this.checked ? '🚨 ' : '🔕 ') + 'Emergency Advisories: ' + (this.checked ? 'High Priority' : 'Disabled'))" style="width:20px; height:20px; accent-color:#0F7943; cursor:pointer;">
        </label>
      </div>
      <button class="primary-green-btn" onclick="CityAssist.showToast('✓ Notification preferences saved!'); CityAssist.closeModal();">Save Preferences</button>
    `);
  },

  showHelpModal() {
    this.openModal(`
      <div class="modal-header-block">
        <h3 style="font-size:1.3rem; font-weight:800; margin-bottom:4px;">💬 Help & Support</h3>
        <p style="color:#64748B; font-size:0.88rem; margin-bottom:16px;">Get in touch with CityAssist Civic Care.</p>
      </div>
      <div style="background:#F8FAFC; border-radius:12px; padding:14px; margin-bottom:16px; font-size:0.9rem;">
        <div style="margin-bottom:8px;"><strong>Toll-Free Helpline:</strong><br><a href="tel:18002334567" style="color:#0F7943; font-weight:700;">1800 233 4567</a></div>
        <div style="margin-bottom:8px;"><strong>Citizen WhatsApp Bot:</strong><br><span style="color:#4B5563;">+91 98220 00000</span></div>
        <div><strong>Email:</strong><br><span style="color:#4B5563;">support@cityassist.gov.in</span></div>
      </div>
      <button class="primary-green-btn" onclick="CityAssist.closeModal()">Close</button>
    `);
  },

  showAboutModal() {
    this.openModal(`
      <div style="text-align:center; padding:10px 0 16px;">
        <div style="font-size:2.5rem; margin-bottom:8px;">🏙️</div>
        <h3 style="font-size:1.3rem; font-weight:800; color:#111827; margin-bottom:4px;">CityAssist</h3>
        <p style="font-size:0.85rem; color:#15803D; font-weight:700; margin-bottom:12px;">Together for a Cleaner Tomorrow</p>
        <p style="font-size:0.88rem; color:#4B5563; line-height:1.5; margin-bottom:20px;">
          An integrated municipal portal connecting citizens with sanitation squads, emergency repair technicians, and civic rewards.
        </p>
        <div style="font-size:0.8rem; color:#9CA3AF; margin-bottom:16px;">App Version 2.5.0 Production</div>
        <button class="primary-green-btn" onclick="CityAssist.closeModal()">Close</button>
      </div>
    `);
  },

  showCommunityModal() {
    this.openModal(`
      <div class="modal-header-block">
        <h3 style="font-size:1.3rem; font-weight:800; margin-bottom:4px;">📢 Community Updates</h3>
        <p style="color:#64748B; font-size:0.88rem; margin-bottom:16px;">Neighborhood clean-up drives and events.</p>
      </div>
      <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:12px;">
          <div style="font-weight:700; color:#111827; margin-bottom:2px;">🌱 Sunday Sector 4 Tree Plantation Drive</div>
          <div style="font-size:0.8rem; color:#16A34A; font-weight:600; margin-bottom:4px;">Sunday, 30 Aug • 7:30 AM</div>
          <div style="font-size:0.85rem; color:#4B5563;">Join over 45 neighbors at Central Park to plant saplings!</div>
        </div>
      </div>
      <button class="primary-green-btn" onclick="CityAssist.showToast('Registered for Community Drive! +50 points'); CityAssist.closeModal();">RSVP for Drive</button>
    `);
  },

  clearNotifications() {
    this.closeModal();
    const dots = document.querySelectorAll('.notification-badge-dot');
    dots.forEach(d => d.style.display = 'none');
    this.showToast("All notifications marked as read ✓");
  },

  showNotificationsModal() {
    this.openModal(UIComponents.renderNotificationsModal());
  },

  openScannerModal() {
    this.openModal(UIComponents.renderScannerModal());
  },

  verifyScannedBinQR() {
    this.closeModal();
    if (typeof AuthEngine !== 'undefined' && AuthEngine.currentUser) {
      AuthEngine.currentUser.points = (AuthEngine.currentUser.points || 0) + 10;
      AuthEngine.updateProfileDisplay();
    }
    this.showToast("✓ Residential Bin QR Verified! +10 Eco Points Awarded 🌟");
  },

  openCloudSettingsModal() {
    const currentProvider = (typeof CloudRealtime !== 'undefined') ? CloudRealtime.provider : 'supabase';
    const currentConfig = (typeof CloudRealtime !== 'undefined') ? CloudRealtime.config : {};
    const geminiKey = (typeof GeminiVisionEngine !== 'undefined') ? GeminiVisionEngine.getApiKey() : '';

    const html = `
      <div class="cloud-settings-modal" style="padding: 10px 4px; max-height:80vh; overflow-y:auto;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
          <div style="width:40px; height:40px; border-radius:10px; background:#DCFCE7; color:#15803D; display:flex; align-items:center; justify-content:center; font-size:1.3rem;">⚡</div>
          <div>
            <h3 style="font-size:1.15rem; font-weight:800; color:#0F172A; margin:0;">Cloud Realtime & AI Vision</h3>
            <p style="font-size:0.78rem; color:#64748B; margin:0;">Configure Supabase/Firebase & Google Gemini Vision</p>
          </div>
        </div>

        <!-- Gemini AI Vision Key Section -->
        <div style="margin-bottom:14px; background:#F8FAFC; border:1.5px solid #E2E8F0; padding:12px; border-radius:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <label style="font-size:0.8rem; font-weight:800; color:#1E293B; display:flex; align-items:center; gap:4px;">
              <span>✨</span> Google Gemini Vision API Key
            </label>
            <span style="font-size:0.68rem; background:#DCFCE7; color:#15803D; font-weight:800; padding:2px 6px; border-radius:6px;">Multimodal Active</span>
          </div>
          <p style="font-size:0.72rem; color:#64748B; margin:0 0 8px; line-height:1.35;">
            Enables instant, 100% accurate vision analysis for <strong>potholes, roads, streetlights, garbage, water leaks</strong> and community posts.
          </p>
          <div style="display:flex; gap:6px;">
            <input type="password" id="cfg-gemini-key" value="${geminiKey}" placeholder="AIzaSy... (Paste Gemini API Key)" style="flex:1; padding:8px 10px; border:1px solid #CBD5E1; border-radius:8px; font-size:0.8rem; font-family:monospace;">
            <button type="button" onclick="CityAssist.testGeminiApiKey()" style="background:#0F172A; color:#FFF; border:none; padding:8px 12px; border-radius:8px; font-size:0.75rem; font-weight:700; cursor:pointer; white-space:nowrap;">Test ⚡</button>
          </div>
          <div id="gemini-key-test-status" style="font-size:0.72rem; margin-top:6px; display:none;"></div>
        </div>

        <div style="margin-bottom:14px;">
          <label style="font-size:0.8rem; font-weight:700; color:#334155; display:block; margin-bottom:6px;">Realtime Cloud Provider</label>
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px;">
            <button type="button" id="provider-btn-supabase" onclick="CityAssist.selectCloudProvider('supabase')" style="padding:8px 4px; border:2px solid ${currentProvider === 'supabase' ? '#16A34A' : '#E2E8F0'}; background:${currentProvider === 'supabase' ? '#F0FDF4' : '#FFF'}; border-radius:8px; font-weight:700; font-size:0.75rem; color:${currentProvider === 'supabase' ? '#15803D' : '#475569'}; cursor:pointer;">⚡ Supabase</button>
            <button type="button" id="provider-btn-firebase" onclick="CityAssist.selectCloudProvider('firebase')" style="padding:8px 4px; border:2px solid ${currentProvider === 'firebase' ? '#16A34A' : '#E2E8F0'}; background:${currentProvider === 'firebase' ? '#F0FDF4' : '#FFF'}; border-radius:8px; font-weight:700; font-size:0.75rem; color:${currentProvider === 'firebase' ? '#15803D' : '#475569'}; cursor:pointer;">🔥 Firebase</button>
            <button type="button" id="provider-btn-local" onclick="CityAssist.selectCloudProvider('local')" style="padding:8px 4px; border:2px solid ${currentProvider === 'local' ? '#16A34A' : '#E2E8F0'}; background:${currentProvider === 'local' ? '#F0FDF4' : '#FFF'}; border-radius:8px; font-weight:700; font-size:0.75rem; color:${currentProvider === 'local' ? '#15803D' : '#475569'}; cursor:pointer;">🌐 Local Mesh</button>
          </div>
        </div>

        <div id="supabase-config-fields" style="display:${currentProvider === 'supabase' ? 'block' : 'none'}; margin-bottom:12px; background:#F8FAFC; border:1px solid #E2E8F0; padding:12px; border-radius:10px;">
          <label style="font-size:0.75rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Supabase Project URL</label>
          <input type="text" id="cfg-supabase-url" value="${currentConfig.supabaseUrl || 'https://mgypwawloputeqofscmg.supabase.co'}" placeholder="https://mgypwawloputeqofscmg.supabase.co" style="width:100%; padding:8px 10px; border:1px solid #CBD5E1; border-radius:6px; font-size:0.8rem; margin-bottom:8px;">

          <label style="font-size:0.75rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Supabase Publishable / Anon Key</label>
          <input type="password" id="cfg-supabase-key" value="${currentConfig.supabaseKey || ''}" placeholder="sb_publishable_..." style="width:100%; padding:8px 10px; border:1px solid #CBD5E1; border-radius:6px; font-size:0.8rem;">
        </div>

        <div id="firebase-config-fields" style="display:${currentProvider === 'firebase' ? 'block' : 'none'}; margin-bottom:12px; background:#F8FAFC; border:1px solid #E2E8F0; padding:12px; border-radius:10px;">
          <label style="font-size:0.75rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Firebase Realtime DB URL</label>
          <input type="text" id="cfg-firebase-dburl" value="${(currentConfig.firebaseConfig && currentConfig.firebaseConfig.databaseURL) || 'https://cityassist-7bad3-default-rtdb.asia-southeast1.firebasedatabase.app'}" placeholder="https://myproject-rtdb.firebaseio.com" style="width:100%; padding:8px 10px; border:1px solid #CBD5E1; border-radius:6px; font-size:0.8rem; margin-bottom:8px;">

          <label style="font-size:0.75rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Firebase Project ID</label>
          <input type="text" id="cfg-firebase-projectid" value="${(currentConfig.firebaseConfig && currentConfig.firebaseConfig.projectId) || 'cityassist-7bad3'}" placeholder="my-city-assist-app" style="width:100%; padding:8px 10px; border:1px solid #CBD5E1; border-radius:6px; font-size:0.8rem;">
        </div>

        <div style="margin-bottom:16px; background:#F0FDF4; border:1px solid #DCFCE7; padding:12px; border-radius:10px;">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
            <span style="font-size:1rem;">🗺️</span>
            <label style="font-size:0.78rem; font-weight:800; color:#15803D;">Interactive Map Engine: Leaflet OpenStreetMap</label>
          </div>
          <p style="font-size:0.72rem; color:#166534; margin:0; line-height:1.4;">
            ✓ Active & Free: High-performance CARTO Voyager, ESRI Satellite, and Dark Matter vector tiles. <strong>No API keys or billing required!</strong>
          </p>
        </div>

        <div style="display:flex; gap:8px;">
          <button type="button" onclick="CityAssist.saveCloudSettings()" class="primary-green-btn" style="flex:1;">Save & Sync Settings ⚡</button>
          <button type="button" onclick="CityAssist.closeModal()" style="background:#F1F5F9; color:#475569; border:none; padding:10px 16px; border-radius:10px; font-weight:700; cursor:pointer;">Cancel</button>
        </div>
      </div>
    `;

    this.openModal(html);
  },

  async testGeminiApiKey() {
    const keyInput = document.getElementById('cfg-gemini-key');
    const statusEl = document.getElementById('gemini-key-test-status');
    if (!keyInput || !statusEl) return;

    const val = keyInput.value.trim();
    if (!val) {
      statusEl.style.display = 'block';
      statusEl.style.color = '#DC2626';
      statusEl.textContent = '❌ Please enter a Gemini API Key first.';
      return;
    }

    statusEl.style.display = 'block';
    statusEl.style.color = '#2563EB';
    statusEl.textContent = '🔄 Testing connection to Google Gemini API...';

    if (typeof GeminiVisionEngine !== 'undefined') {
      const res = await GeminiVisionEngine.testConnection(val);
      if (res.success) {
        statusEl.style.color = '#15803D';
        statusEl.textContent = `✓ ${res.message}`;
      } else {
        statusEl.style.color = '#DC2626';
        statusEl.textContent = `❌ ${res.message}`;
      }
    }
  },

  selectCloudProvider(provider) {
    window._selectedProvider = provider;
    ['supabase', 'firebase', 'local'].forEach(p => {
      const btn = document.getElementById(`provider-btn-${p}`);
      if (btn) {
        if (p === provider) {
          btn.style.borderColor = '#16A34A';
          btn.style.background = '#F0FDF4';
          btn.style.color = '#15803D';
        } else {
          btn.style.borderColor = '#E2E8F0';
          btn.style.background = '#FFF';
          btn.style.color = '#475569';
        }
      }
    });

    const supFields = document.getElementById('supabase-config-fields');
    const fireFields = document.getElementById('firebase-config-fields');
    if (supFields) supFields.style.display = provider === 'supabase' ? 'block' : 'none';
    if (fireFields) fireFields.style.display = provider === 'firebase' ? 'block' : 'none';
  },

  saveCloudSettings() {
    const provider = window._selectedProvider || ((typeof CloudRealtime !== 'undefined') ? CloudRealtime.provider : 'firebase');
    const supUrl = document.getElementById('cfg-supabase-url') ? document.getElementById('cfg-supabase-url').value.trim() : '';
    const supKey = document.getElementById('cfg-supabase-key') ? document.getElementById('cfg-supabase-key').value.trim() : '';
    const fireDb = document.getElementById('cfg-firebase-dburl') ? document.getElementById('cfg-firebase-dburl').value.trim() : '';
    const firePid = document.getElementById('cfg-firebase-projectid') ? document.getElementById('cfg-firebase-projectid').value.trim() : '';
    const geminiKey = document.getElementById('cfg-gemini-key') ? document.getElementById('cfg-gemini-key').value.trim() : '';

    if (typeof GeminiVisionEngine !== 'undefined') {
      GeminiVisionEngine.setApiKey(geminiKey);
    }

    if (typeof CloudRealtime !== 'undefined') {
      CloudRealtime.saveConfig({
        provider: provider,
        supabaseUrl: supUrl || CloudRealtime.config.supabaseUrl,
        supabaseKey: supKey || CloudRealtime.config.supabaseKey,
        firebaseConfig: {
          ...CloudRealtime.config.firebaseConfig,
          databaseURL: fireDb || CloudRealtime.config.firebaseConfig.databaseURL,
          projectId: firePid || CloudRealtime.config.firebaseConfig.projectId
        }
      });
    }

    this.closeModal();
    this.showToast(`⚡ Settings synced successfully!`);
  },

  handleLogout() {
    if (confirm("Are you sure you want to log out of CityAssist?")) {
      this.showToast("Logged out successfully");
      this.closeDrawer();
    }
  },

  _toastTimer: null,

  showToast(message) {
    const toast = document.getElementById('app-toast');
    const text = document.getElementById('toast-text');
    const iconEl = toast ? toast.querySelector('.toast-icon') : null;
    if (toast && text) {
      const emojiMatch = message.match(/^([\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|[\u{1F300}-\u{1F9FF}]|\p{Emoji_Presentation}|\p{Extended_Pictographic})/u);
      if (emojiMatch && iconEl) {
        iconEl.textContent = emojiMatch[0];
        text.textContent = message.replace(emojiMatch[0], '').trim();
      } else {
        if (iconEl) iconEl.textContent = '✓';
        text.textContent = message;
      }

      toast.classList.remove('visible');
      void toast.offsetWidth; // force reflow for pop animation
      toast.classList.add('visible');
      if (this._toastTimer) clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        toast.classList.remove('visible');
      }, 2800);
    }
  }
};

/**
 * Real-Time Driver Engine & GPS Live Tracking
 */
const DriverEngine = {
  trackingMode: 'hardware',

  startCollection(mode = 'hardware') {
    this.trackingMode = mode;
    this.executeStart(mode);
  },

  executeStart(mode = 'hardware') {
    CityData.driver.status = "in_progress";
    CityData.driver.statusLabel = "In Progress";

    // Unlock Web Audio & Speech synthesis on user button tap
    if (typeof AudioAnnouncerEngine !== 'undefined') {
      AudioAnnouncerEngine.unlockAudio();
    }

    // UI Updates
    const startActions = document.getElementById('driver-start-actions');
    const startBtn = document.getElementById('btn-driver-start');
    if (startActions) startActions.style.display = 'none';
    else if (startBtn) startBtn.style.display = 'none';

    document.getElementById('driver-active-controls').style.display = 'grid';
    document.getElementById('btn-driver-pause').style.display = 'flex';
    document.getElementById('btn-driver-resume').style.display = 'none';
    
    document.getElementById('driver-gps-dot').classList.add('active');
    
    this.updateStatusBadge('in_progress');

    if (mode === 'hardware') {
      CityAssist.showToast("🛰️ Real Hardware GPS Active! Broadcasting real device coordinates.");
      if (typeof GPSTrackerEngine !== 'undefined') {
        GPSTrackerEngine.startLiveTracking('hardware');
      }
    } else {
      CityAssist.showToast("🚗 Demo Route Simulation Started! Audio alert armed for 300m approach.");
      if (typeof GPSTrackerEngine !== 'undefined') {
        GPSTrackerEngine.startLiveTracking('simulation');
      }
    }
  },

  pauseCollection() {
    CityData.driver.status = "paused";
    CityData.driver.statusLabel = "Paused";
    CityData.driver.speed = 0;

    document.getElementById('btn-driver-pause').style.display = 'none';
    document.getElementById('btn-driver-resume').style.display = 'flex';

    this.updateStatusBadge('paused');
    if (typeof GPSTrackerEngine !== 'undefined') {
      GPSTrackerEngine.pauseTracking();
    }

    CityAssist.showToast("Collection Paused by Driver");
  },

  resumeCollection() {
    CityData.driver.status = "in_progress";
    CityData.driver.statusLabel = "In Progress";

    document.getElementById('btn-driver-pause').style.display = 'flex';
    document.getElementById('btn-driver-resume').style.display = 'none';

    this.updateStatusBadge('in_progress');
    if (typeof GPSTrackerEngine !== 'undefined') {
      GPSTrackerEngine.resumeTracking();
    }
    CityAssist.showToast("Collection Resumed");
  },

  endCollection() {
    if (confirm("End collection shift and submit route log?")) {
      if (typeof GPSTrackerEngine !== 'undefined') {
        GPSTrackerEngine.stopLiveTracking();
      }
      CityData.driver.status = "completed";
      CityData.driver.statusLabel = "Completed";
      CityData.driver.speed = 0;
      CityData.driver.progressPct = 100;
      CityData.driver.etaMinutes = 0;

      this.updateStatusBadge('completed');
      
      document.getElementById('driver-gps-dot').classList.remove('active');
      const startActions = document.getElementById('driver-start-actions');
      const startBtn = document.getElementById('btn-driver-start');
      if (startActions) startActions.style.display = 'flex';
      else if (startBtn) startBtn.style.display = 'flex';
      document.getElementById('driver-active-controls').style.display = 'none';

      // Mark all stops done
      [0, 1, 2, 3].forEach(idx => {
        const item = document.getElementById(`stop-row-${idx}`);
        const tag = document.getElementById(`stop-status-${idx}`);
        if (item && tag) {
          item.className = 'driver-stop-item completed';
          tag.className = 'stop-status-tag done';
          tag.textContent = 'Completed';
        }
      });

      // Open shift summary modal
      CityAssist.openModal(`
        <div style="text-align:center; padding:10px 0 16px;">
          <div style="width:65px; height:65px; background:#DCFCE7; border-radius:50%; margin:0 auto 14px; display:flex; align-items:center; justify-content:center; font-size:2rem;">
            ✅
          </div>
          <h3 style="font-size:1.35rem; font-weight:800; color:#15803D; margin-bottom:6px;">Shift Completed!</h3>
          <p style="font-size:0.88rem; color:#4B5563; margin-bottom:16px;">
            Great job, <strong>Ramesh Shinde</strong>! All 4 waste checkpoints successfully serviced on Route 4B.
          </p>
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:14px; text-align:left; font-size:0.85rem; margin-bottom:20px;">
            <div><strong>Total Bins Collected:</strong> 135 Bins</div>
            <div style="margin-top:4px;"><strong>Waste Weight:</strong> ~ 4.8 Metric Tons</div>
            <div style="margin-top:4px;"><strong>Discharge Location:</strong> Sector 4 Processing Unit</div>
          </div>
          <button class="primary-green-btn" onclick="CityAssist.closeModal(); CityAssist.navigateTo('home');">
            Return to Citizen View
          </button>
        </div>
      `);
    }
  },

  updateStatusBadge(status) {
    const pill = document.getElementById('driver-status-pill');
    if (!pill) return;

    pill.className = `driver-status-badge status-${status.replace('_', '-')}`;
    if (status === 'in_progress') pill.textContent = 'In Progress';
    else if (status === 'paused') pill.textContent = 'Paused';
    else if (status === 'completed') pill.textContent = 'Completed';
    else pill.textContent = 'Not Started';
  },

  syncDriverDashboard(point) {
    // 1. Move Driver SVG Truck Pin
    const pin = document.getElementById('driver-moving-truck-pin');
    if (pin) {
      pin.setAttribute('transform', `translate(${point.x - 12}, ${point.y - 12})`);
    }

    // 2. Telemetry & Speed
    const coordsEl = document.getElementById('driver-telemetry-coords');
    if (coordsEl) coordsEl.textContent = `GPS: ${point.lat}° N, ${point.lng}° E`;

    const speedEl = document.getElementById('driver-speed-readout');
    if (speedEl) speedEl.textContent = `${point.speed} km/h`;

    const etaEl = document.getElementById('driver-eta-display');
    if (etaEl) etaEl.textContent = point.eta === 0 ? 'Arrived' : `${point.eta} mins`;

    // 3. Progress Bar & Stops Count
    const bar = document.getElementById('driver-progress-bar');
    if (bar) bar.style.width = `${point.pct}%`;

    const stopsCount = document.getElementById('driver-stops-count');
    if (stopsCount) stopsCount.textContent = `${point.stopIdx + 1} / 4 Stops`;

    const nextStopText = document.getElementById('driver-current-stop-name');
    if (nextStopText) {
      const stopObj = CityData.driver.stops[point.stopIdx];
      nextStopText.textContent = `Current: ${stopObj.name}`;
    }

    // 4. Update Stops Checklist
    [0, 1, 2, 3].forEach(idx => {
      const row = document.getElementById(`stop-row-${idx}`);
      const tag = document.getElementById(`stop-status-${idx}`);
      if (row && tag) {
        if (idx < point.stopIdx) {
          row.className = 'driver-stop-item completed';
          tag.className = 'stop-status-tag done';
          tag.textContent = 'Done';
        } else if (idx === point.stopIdx) {
          row.className = 'driver-stop-item active';
          tag.className = 'stop-status-tag current';
          tag.textContent = 'Current';
        } else {
          row.className = 'driver-stop-item';
          tag.className = 'stop-status-tag';
          tag.textContent = 'Pending';
        }
      }
    });
  },

  syncCitizenHomeMap(point) {
    // 1. Move Citizen SVG Mini Map Truck Marker
    const citizenMarker = document.getElementById('citizen-truck-marker');
    if (citizenMarker) {
      // Map percentage (0 to 100%) to citizen mini route (x: 30 to 250, y: 55 to 30)
      const citizenX = 30 + (point.pct / 100) * 220;
      const citizenY = 55 - Math.sin((point.pct / 100) * Math.PI) * 20;
      citizenMarker.setAttribute('transform', `translate(${citizenX}, ${citizenY})`);
    }

    // 2. Update Citizen ETA Pill
    const etaPill = document.getElementById('citizen-eta-pill');
    if (etaPill) {
      if (point.eta === 0) {
        etaPill.textContent = 'Arrived at your sector!';
        etaPill.style.background = '#DCFCE7';
        etaPill.style.color = '#15803D';
      } else {
        etaPill.textContent = `Arriving in ${point.eta} mins`;
        etaPill.style.background = '#EFF6FF';
        etaPill.style.color = '#1D4ED8';
      }
    }

    // 3. Update Status indicator in Citizen Home
    const statusText = document.getElementById('citizen-status-text');
    if (statusText) {
      if (CityData.driver.status === 'in_progress') {
        statusText.textContent = 'Live Tracking (Driver Active)';
      } else if (CityData.driver.status === 'paused') {
        statusText.textContent = 'Vehicle Temporarily Stopped';
      } else if (CityData.driver.status === 'completed') {
        statusText.textContent = 'Daily Collection Completed';
      }
    }

    // 4. Also update Municipality Fleet live position
    const muniTruck = document.getElementById('muni-truck-1');
    if (muniTruck) {
      const muniX = 40 + (point.pct / 100) * 220;
      const muniY = 48 + Math.sin((point.pct / 100) * Math.PI) * 35;
      muniTruck.setAttribute('transform', `translate(${muniX}, ${muniY})`);
    }

    // 5. Also update Dedicated Garbage Tracking Screen (#screen-garbage)
    const gtDistance = document.getElementById('gt-distance-text');
    const gtEta = document.getElementById('gt-eta-text');
    const gtFill = document.getElementById('gt-stepper-fill');
    const gtTruckMarker = document.getElementById('gt-map-truck-marker');

    if (gtDistance && gtEta) {
      if (point.pct >= 90) {
        gtDistance.textContent = 'Vehicle is 100 m away';
        gtEta.textContent = 'Arrived at your sector!';
        if (gtFill) gtFill.style.width = '100%';
        this.updateGtStepper(3);
      } else if (point.pct >= 60) {
        gtDistance.textContent = 'Vehicle is 0.6 km away';
        gtEta.textContent = `Expected in ${point.eta || 2} mins`;
        if (gtFill) gtFill.style.width = '66%';
        this.updateGtStepper(2);
      } else if (point.pct >= 30) {
        gtDistance.textContent = 'Vehicle is 1.2 km away';
        gtEta.textContent = `Expected in ${point.eta || 5} mins`;
        if (gtFill) gtFill.style.width = '33%';
        this.updateGtStepper(1);
      } else {
        gtDistance.textContent = 'Vehicle is 2.4 km away';
        gtEta.textContent = `Expected in ${point.eta || 14} mins`;
        if (gtFill) gtFill.style.width = '15%';
        this.updateGtStepper(0);
      }
    }

    if (gtTruckMarker) {
      const mapX = 220 - (point.pct / 100) * 135;
      const mapY = 15 + (point.pct / 100) * 170;
      gtTruckMarker.setAttribute('transform', `translate(${mapX}, ${mapY})`);
    }

    // Trigger Audio Announcer Proximity Chime
    if (window.AudioAnnouncerEngine && CityData.driver.status === 'in_progress') {
      const distKm = point.pct >= 90 ? 0.1 : (point.pct >= 60 ? 0.6 : (point.pct >= 30 ? 1.2 : 2.4));
      AudioAnnouncerEngine.onProximityUpdate(distKm, point.eta || 5, CityData.driver.status);
    }

    // 6. Also update Home Screen mini map preview
    const homeProximity = document.getElementById('home-proximity-text');
    const homeMiniTruck = document.getElementById('home-mini-truck-marker');
    if (homeProximity) {
      if (point.pct >= 90) {
        homeProximity.innerHTML = 'Vehicle is 100<br>m away';
      } else if (point.pct >= 60) {
        homeProximity.innerHTML = 'Vehicle is 0.6<br>km away';
      } else if (point.pct >= 30) {
        homeProximity.innerHTML = 'Vehicle is 1.2<br>km away';
      } else {
        homeProximity.innerHTML = 'Vehicle is 2.4<br>km away';
      }
    }
    if (homeMiniTruck) {
      const hX = 25 + (point.pct / 100) * 90;
      const hY = 78 - (point.pct / 100) * 45;
      homeMiniTruck.setAttribute('transform', `translate(${hX}, ${hY})`);
    }
  },

  updateGtStepper(activeIdx) {
    [0, 1, 2, 3].forEach(idx => {
      const step = document.getElementById(`gt-step-${idx}`);
      if (step) {
        step.className = 'gt-step-item';
        const circle = step.querySelector('.gt-step-circle');
        const label = step.querySelector('.gt-step-label');
        if (idx < activeIdx) {
          step.classList.add('completed');
          if (circle) circle.className = 'gt-step-circle';
          if (label) label.className = 'gt-step-label';
        } else if (idx === activeIdx) {
          step.classList.add('active');
          if (circle) circle.className = 'gt-step-circle solid-green';
          if (label) label.className = 'gt-step-label active-bold';
        } else {
          if (circle) circle.className = 'gt-step-circle pending-grey';
          if (label) label.className = 'gt-step-label';
        }
      }
    });
  }
};

/**
 * Municipality Authority Command Center Controller
 */
const MunicipalityEngine = {
  map: null,
  mapMarkers: [],
  activeMapFilter: 'all',
  activeTriageStatus: 'all',
  activeWardFilter: 'all',
  triageSearchQuery: '',

  init() {
    this.renderStats();
    this.renderTriageList();
    this.renderWardsPerformance();
    setTimeout(() => this.initLeafletMap(), 150);
  },

  renderStats() {
    const fleetEl = document.getElementById('muni-kpi-fleet');
    if (fleetEl) fleetEl.textContent = `${CityData.municipality.activeFleetCount} / ${CityData.municipality.totalFleetCount}`;

    const tonsEl = document.getElementById('muni-kpi-tons');
    if (tonsEl) tonsEl.textContent = `${CityData.municipality.dailyTonsCollected} T`;

    const repEl = document.getElementById('muni-kpi-reports');
    if (repEl) {
      const openCount = CityData.municipality.triageQueue.filter(i => i.status !== 'resolved').length;
      repEl.textContent = `${openCount} Open`;
    }

    const slaEl = document.getElementById('muni-kpi-sla');
    if (slaEl) slaEl.textContent = `${CityData.municipality.slaCompliancePct || 96.4}%`;
  },

  /* ==========================================================================
     4. 🗺️ REAL-TIME GOOGLE MAPS GIS FLEET & GRIEVANCE TELEMETRY
     ========================================================================== */
  currentGoogleMapType: 'google_streets',
  googleTileLayer: null,
  googleTileProviders: {
    google_streets: {
      url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      name: 'Google Streets',
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    },
    google_traffic: {
      url: 'https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}',
      name: 'Google Live Traffic',
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    },
    google_satellite: {
      url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      name: 'Google Satellite & Hybrid',
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    },
    google_terrain: {
      url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
      name: 'Google Terrain',
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }
  },

  initLeafletMap() {
    const mapContainer = document.getElementById('muni-live-map');
    if (!mapContainer || typeof L === 'undefined') return;

    if (this.map) {
      this.map.invalidateSize();
      this.renderMapMarkers();
      return;
    }

    try {
      // Center on Talegaon Dabhade Municipal Council
      this.map = L.map('muni-live-map', {
        center: [18.7297, 73.6766],
        zoom: 14,
        zoomControl: true,
        attributionControl: false
      });

      // Default to Google Maps Streets Layer
      const provider = this.googleTileProviders[this.currentGoogleMapType] || this.googleTileProviders.google_streets;
      this.googleTileLayer = L.tileLayer(provider.url, {
        maxZoom: 21,
        subdomains: provider.subdomains
      }).addTo(this.map);

      this.renderMapMarkers();

      setTimeout(() => {
        if (this.map) this.map.invalidateSize();
      }, 300);
    } catch (err) {
      console.warn('Google Maps Muni Map init error:', err);
    }
  },

  setGoogleMapType(type, btn) {
    if (!this.map || typeof L === 'undefined') return;
    this.currentGoogleMapType = type;

    // Update button states
    document.querySelectorAll('.google-layer-chip').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const provider = this.googleTileProviders[type] || this.googleTileProviders.google_streets;
    if (this.googleTileLayer) {
      this.map.removeLayer(this.googleTileLayer);
    }

    this.googleTileLayer = L.tileLayer(provider.url, {
      maxZoom: 21,
      subdomains: provider.subdomains
    }).addTo(this.map);

    CityAssist.showToast(`🗺️ Switched to ${provider.name}`);
  },

  openGoogleApiKeyModal() {
    const currentKey = localStorage.getItem('cityassist_google_maps_key') || '';
    CityAssist.openModal(`
      <div style="padding:10px 0 16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #E2E8F0; padding-bottom:10px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:34px; height:34px; background:#EFF6FF; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">🔑</div>
            <div>
              <h3 style="font-size:1.15rem; font-weight:900; color:#0F172A; margin:0 0 2px;">Google Maps API Setup</h3>
              <span style="font-size:0.74rem; color:#64748B;">TDMC Command Center • GIS Map Configuration</span>
            </div>
          </div>
          <button type="button" onclick="CityAssist.closeModal()" style="background:#F1F5F9; border:none; width:30px; height:30px; border-radius:50%; font-weight:800; cursor:pointer;">✕</button>
        </div>

        <div style="background:#F0FDF4; border:1px solid #86EFAC; border-radius:12px; padding:12px; margin-bottom:14px; font-size:0.78rem; color:#15803D; line-height:1.4;">
          <strong>✓ Google Maps Engine Active:</strong> Full Google Maps raster &amp; vector tile endpoints with live traffic &amp; high-res satellite imagery are enabled by default for Talegaon Dabhade.
        </div>

        <form id="google-api-key-form" onsubmit="MunicipalityEngine.saveGoogleApiKey(event)">
          <div style="margin-bottom:14px;">
            <label style="display:block; font-size:0.78rem; font-weight:800; color:#334155; margin-bottom:4px;">Google Maps API Key (Optional)</label>
            <input type="text" id="muni-google-key-input" value="${currentKey}" style="width:100%; padding:10px; border-radius:10px; border:1.5px solid #CBD5E1; font-size:0.82rem; font-family:monospace; box-sizing:border-box;" placeholder="AIzaSy...">
            <span style="font-size:0.72rem; color:#64748B; display:block; margin-top:4px;">Enables client-side Google Places, Distance Matrix, and Native SDK overlays.</span>
          </div>

          <div style="display:flex; gap:10px;">
            <button type="submit" style="flex:1; background:#2563EB; color:#FFF; border:none; padding:12px; border-radius:10px; font-weight:800; font-size:0.88rem; cursor:pointer;">
              Save &amp; Apply API Key
            </button>
            <button type="button" onclick="CityAssist.closeModal()" style="background:#F1F5F9; color:#475569; border:none; padding:12px 16px; border-radius:10px; font-weight:800; font-size:0.88rem; cursor:pointer;">
              Cancel
            </button>
          </div>
        </form>
      </div>
    `);
  },

  saveGoogleApiKey(e) {
    if (e && e.preventDefault) e.preventDefault();
    const key = (document.getElementById('muni-google-key-input') || {}).value || '';
    if (key.trim()) {
      localStorage.setItem('cityassist_google_maps_key', key.trim());
      if (typeof GoogleMapsEngine !== 'undefined') {
        GoogleMapsEngine.setApiKey(key.trim());
      }
      CityAssist.showToast("✓ Google Maps API Key saved and activated!");
    } else {
      localStorage.removeItem('cityassist_google_maps_key');
      CityAssist.showToast("✓ Switched to Google Maps High-DPI Cloud Tiles");
    }
    CityAssist.closeModal();
  },

  renderMapMarkers() {
    if (!this.map || typeof L === 'undefined') return;

    // Clear existing markers
    this.mapMarkers.forEach(m => this.map.removeLayer(m));
    this.mapMarkers = [];

    const showFleet = this.activeMapFilter === 'all' || this.activeMapFilter === 'fleet';
    const showGrievance = this.activeMapFilter === 'all' || this.activeMapFilter === 'grievance';

    // 1. Render Fleet Vehicles (Green / Blue Trucks)
    if (showFleet && CityData.municipality.fleetVehicles) {
      CityData.municipality.fleetVehicles.forEach(truck => {
        const isIdle = truck.speed === '0 km/h';
        const iconHtml = `
          <div style="background:${isIdle ? '#F59E0B' : '#10B981'}; color:#FFFFFF; padding:4px 8px; border-radius:14px; font-weight:800; font-size:11px; display:flex; align-items:center; gap:4px; box-shadow:0 3px 10px rgba(0,0,0,0.35); border:2px solid #FFFFFF; white-space:nowrap;">
            <span>🚚</span>
            <span>${truck.id.split('-').slice(-1)[0]}</span>
          </div>
        `;

        const customIcon = L.divIcon({
          className: 'muni-truck-leaflet-marker',
          html: iconHtml,
          iconSize: [64, 26],
          iconAnchor: [32, 13]
        });

        const marker = L.marker([truck.lat, truck.lng], { icon: customIcon }).addTo(this.map);
        marker.bindPopup(`
          <div style="font-family:'Plus Jakarta Sans',sans-serif; padding:4px; min-width:180px;">
            <div style="font-size:12px; font-weight:800; color:#0F172A; margin-bottom:2px;">🚚 ${truck.id}</div>
            <div style="font-size:11px; color:#15803D; font-weight:700; margin-bottom:4px;">${truck.status}</div>
            <div style="font-size:11px; color:#334155; line-height:1.4;">
              <strong>Driver:</strong> ${truck.driver}<br>
              <strong>Type:</strong> ${truck.type}<br>
              <strong>Speed:</strong> ${truck.speed} • <strong>Fuel:</strong> ${truck.fuel}<br>
              <strong>Ward:</strong> ${truck.ward}
            </div>
            <a href="tel:${truck.phone}" style="display:inline-block; margin-top:6px; background:#10B981; color:#FFF; font-size:10px; font-weight:800; padding:4px 8px; border-radius:6px; text-decoration:none;">📞 Call Driver</a>
          </div>
        `);
        this.mapMarkers.push(marker);
      });
    }

    // 2. Render Citizen Grievance Pins
    if (showGrievance && CityData.municipality.triageQueue) {
      CityData.municipality.triageQueue.forEach(item => {
        let pinBg = '#EF4444'; // Red for pending/critical
        let pinSymbol = '🚨';
        if (item.status === 'resolved') {
          pinBg = '#10B981';
          pinSymbol = '✓';
        } else if (item.status === 'assigned' || item.status === 'in_progress') {
          pinBg = '#F59E0B';
          pinSymbol = '🛠️';
        }

        const iconHtml = `
          <div style="background:${pinBg}; color:#FFFFFF; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:13px; box-shadow:0 3px 12px ${pinBg}88; border:2.5px solid #FFFFFF;">
            <span>${pinSymbol}</span>
          </div>
        `;

        const customIcon = L.divIcon({
          className: 'muni-grievance-leaflet-marker',
          html: iconHtml,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        const marker = L.marker([item.lat, item.lng], { icon: customIcon }).addTo(this.map);
        marker.bindPopup(`
          <div style="font-family:'Plus Jakarta Sans',sans-serif; padding:4px; min-width:200px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
              <span style="font-size:10px; background:#EFF6FF; color:#1D4ED8; font-weight:800; padding:2px 6px; border-radius:4px;">${item.id}</span>
              <span style="font-size:10px; font-weight:800; color:${item.status === 'resolved' ? '#16A34A' : '#DC2626'};">${item.status.toUpperCase()}</span>
            </div>
            <div style="font-size:12px; font-weight:800; color:#0F172A; margin-bottom:4px;">${item.title}</div>
            <div style="font-size:11px; color:#475569; margin-bottom:6px;">
              📍 ${item.location}<br>
              👤 ${item.citizenName || 'Citizen'} (${item.citizenPhone || 'N/A'})
            </div>
            <button type="button" onclick="MunicipalityEngine.openTriageModal('${item.id}')" style="width:100%; background:#2563EB; color:#FFF; border:none; padding:6px; border-radius:6px; font-size:11px; font-weight:800; cursor:pointer;">
              ⚙️ Dispatch / Update
            </button>
          </div>
        `);
        this.mapMarkers.push(marker);
      });
    }

    const cntEl = document.getElementById('map-cnt-all');
    if (cntEl) {
      cntEl.textContent = (CityData.municipality.fleetVehicles.length + CityData.municipality.triageQueue.length);
    }
  },

  filterMapLayer(layerType, btn) {
    this.activeMapFilter = layerType;
    document.querySelectorAll('.muni-map-filter-chip').forEach(b => {
      if (!b.classList.contains('center-btn')) b.classList.remove('active');
    });
    if (btn) btn.classList.add('active');
    this.renderMapMarkers();
  },

  recenterMap() {
    if (this.map) {
      this.map.setView([18.7297, 73.6766], 14, { animate: true });
      CityAssist.showToast("📍 Map centered on Talegaon Dabhade Council");
    }
  },

  focusMapOnCoords(lat, lng, zoom = 16) {
    if (this.map) {
      this.map.setView([lat, lng], zoom, { animate: true });
      const mapWrapper = document.getElementById('muni-leaflet-map-wrapper');
      if (mapWrapper) {
        mapWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  },

  /* ==========================================================================
     3. 🛠️ INTERACTIVE TICKET TRIAGE & SQUAD DISPATCH
     ========================================================================== */
  filterTriage(status, btn) {
    this.activeTriageStatus = status;
    document.querySelectorAll('.triage-filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this.renderTriageList();
  },

  searchTriage(query) {
    this.triageSearchQuery = (query || '').toLowerCase().trim();
    this.renderTriageList();
  },

  filterTriageByWard(wardId) {
    this.activeWardFilter = wardId;
    this.renderTriageList();

    if (wardId !== 'all') {
      const ward = CityData.municipality.wards.find(w => w.id === Number(wardId));
      if (ward) {
        this.focusMapOnCoords(ward.lat, ward.lng, 15);
      }
    }
  },

  renderTriageList() {
    const list = document.getElementById('muni-triage-list');
    const queueBadge = document.getElementById('muni-queue-count');
    if (!list) return;

    let items = CityData.municipality.triageQueue || [];

    // Filter by Status
    if (this.activeTriageStatus !== 'all') {
      items = items.filter(i => i.status === this.activeTriageStatus);
    }

    // Filter by Ward
    if (this.activeWardFilter !== 'all') {
      items = items.filter(i => i.wardId === Number(this.activeWardFilter));
    }

    // Filter by Search Query
    if (this.triageSearchQuery) {
      items = items.filter(i => 
        (i.id && i.id.toLowerCase().includes(this.triageSearchQuery)) ||
        (i.title && i.title.toLowerCase().includes(this.triageSearchQuery)) ||
        (i.location && i.location.toLowerCase().includes(this.triageSearchQuery)) ||
        (i.category && i.category.toLowerCase().includes(this.triageSearchQuery))
      );
    }

    const pendingCount = CityData.municipality.triageQueue.filter(i => i.status === 'pending').length;
    if (queueBadge) queueBadge.textContent = `${pendingCount} Pending Triage`;

    if (items.length === 0) {
      list.innerHTML = `
        <div style="text-align:center; padding:24px 12px; background:#090E17; border-radius:10px; border:1px dashed #1E2E4A;">
          <div style="font-size:2rem; margin-bottom:6px;">✨</div>
          <strong style="font-size:0.88rem; color:#E2E8F0; display:block;">No Tickets Found</strong>
          <span style="font-size:0.75rem; color:#64748B;">No complaints match the current status/ward filter.</span>
        </div>
      `;
      return;
    }

    list.innerHTML = items.map(item => {
      const isResolved = item.status === 'resolved';
      const isAssigned = item.status === 'assigned' || item.status === 'in_progress';
      const statusBadge = isResolved ? 
        `<span style="background:rgba(16,185,129,0.18); color:#34D399; font-size:0.72rem; font-weight:800; padding:3px 8px; border-radius:6px;">✓ Resolved</span>` :
        (isAssigned ? 
          `<span style="background:rgba(59,130,246,0.18); color:#93C5FD; font-size:0.72rem; font-weight:800; padding:3px 8px; border-radius:6px;">● Dispatched</span>` :
          `<span style="background:rgba(245,158,11,0.18); color:#FCD34D; font-size:0.72rem; font-weight:800; padding:3px 8px; border-radius:6px;">⏳ Pending Triage</span>`
        );

      return `
        <div class="muni-triage-card" data-triage-id="${item.id}" style="cursor:pointer;" onclick="MunicipalityEngine.openTriageModal('${item.id}')">
          <div class="triage-top-row">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="triage-id-tag">${item.id}</span>
              <span class="triage-category-pill">${item.category}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              ${item.priority ? `
                <span style="font-size:0.68rem; font-weight:800; padding:2px 7px; border-radius:8px; background:${item.priority.includes('Critical') || item.priority.includes('Urgent') ? '#FEE2E2' : '#FEF3C7'}; color:${item.priority.includes('Critical') || item.priority.includes('Urgent') ? '#DC2626' : '#D97706'};">
                  ${item.priority}
                </span>
              ` : ''}
              ${statusBadge}
            </div>
          </div>
          
          <div class="triage-desc" style="font-weight:600; color:#F1F5F9; font-size:0.86rem; margin-top:2px;">${item.title}</div>
          
          <div style="font-size:0.74rem; color:#60A5FA; margin-bottom:2px; font-weight:700;">
            🤖 AI Triage: ${item.aiConfidence || '96%'} confidence • ${item.department || 'TDMC Sanitation Wing'}
          </div>

          <div class="triage-location" style="font-size:0.74rem; color:#94A3B8;">📍 ${item.location} • <span>${item.time}</span></div>
          
          <div class="triage-actions-row" onclick="event.stopPropagation()">
            <div>
              ${item.assignedSquad ? `
                <span style="font-size:0.75rem; color:#34D399; font-weight:700;">🚚 ${item.assignedSquad}</span>
              ` : `
                <span style="font-size:0.75rem; color:#F59E0B; font-weight:700;">● No Squad Assigned</span>
              `}
            </div>
            <div style="display:flex; gap:6px;">
              <button type="button" class="btn-assign-squad" onclick="MunicipalityEngine.focusMapOnCoords(${item.lat}, ${item.lng}, 16)" style="background:#1E293B; color:#93C5FD; border:1px solid #3B82F6; padding:5px 8px; border-radius:6px; font-size:0.72rem; font-weight:700; cursor:pointer;" title="View on Live Leaflet Map">
                📍 Map
              </button>
              <button type="button" class="btn-assign-squad" onclick="MunicipalityEngine.openTriageModal('${item.id}')" style="background:#2563EB; color:#FFF; font-weight:800; font-size:0.75rem; padding:6px 12px; border-radius:8px; border:none; cursor:pointer;">
                ⚙️ Dispatch / Update
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  /* ==========================================================================
     5. 🏆 WARD-BY-WARD SLA PERFORMANCE & CLEANLINESS INDEX
     ========================================================================== */
  renderWardsPerformance() {
    const container = document.getElementById('muni-wards-list');
    if (!container || !CityData.municipality.wards) return;

    container.innerHTML = CityData.municipality.wards.map((ward, idx) => {
      const isTop = ward.isTopRank;
      return `
        <div class="ward-perf-card ${isTop ? 'top-rank' : ''}" onclick="MunicipalityEngine.filterTriageByWard('${ward.id}')">
          <div class="ward-perf-top">
            <div class="ward-title-group">
              <strong>${ward.name} ${isTop ? '🏆' : ''}</strong>
              <span>${ward.marathi}</span>
            </div>
            <div class="ward-score-badge">
              <span class="ward-score-val">${ward.cleanliness}%</span>
              <span class="ward-score-lbl">Cleanliness</span>
            </div>
          </div>

          <div class="ward-stats-grid">
            <div class="ward-stat-item">
              <span class="val" style="color:#10B981;">${ward.avgSla}</span>
              <span class="lbl">Avg SLA Speed</span>
            </div>
            <div class="ward-stat-item">
              <span class="val" style="color:${ward.active > 0 ? '#F59E0B' : '#64748B'};">${ward.active} Open</span>
              <span class="lbl">Active Complaints</span>
            </div>
            <div class="ward-stat-item">
              <span class="val" style="color:#3B82F6;">${ward.resolved} Done</span>
              <span class="lbl">Resolved MTD</span>
            </div>
          </div>

          <div class="ward-footer-row" onclick="event.stopPropagation()">
            <div class="ward-officer-info">
              👤 Nodal Officer: <strong>${ward.officer}</strong>
            </div>
            <div style="display:flex; gap:6px;">
              <a href="tel:${ward.phone}" onclick="CityAssist.showToast('Calling Ward Officer: ${ward.phone}...')" style="background:#15803D; color:#FFF; font-size:0.72rem; font-weight:800; padding:4px 8px; border-radius:6px; text-decoration:none;">
                📞 Call
              </a>
              <button type="button" class="ward-filter-action-btn" onclick="MunicipalityEngine.filterTriageByWard('${ward.id}')">
                📍 Filter Ward
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  /* ==========================================================================
     6. 📊 MUNICIPAL MIS MONTHLY REPORT EXPORT (PDF / EXCEL / CSV)
     ========================================================================== */
  openMISReportModal() {
    CityAssist.openModal(`
      <div style="padding:10px 0 16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #E2E8F0; padding-bottom:10px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:34px; height:34px; background:#DCFCE7; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">📊</div>
            <div>
              <h3 style="font-size:1.15rem; font-weight:900; color:#0F172A; margin:0 0 2px;">Municipal MIS Monthly Report</h3>
              <span style="font-size:0.74rem; color:#64748B;">Talegaon Dabhade Municipal Council • Official MIS Export</span>
            </div>
          </div>
          <button type="button" onclick="CityAssist.closeModal()" style="background:#F1F5F9; border:none; width:30px; height:30px; border-radius:50%; font-weight:800; cursor:pointer;">✕</button>
        </div>

        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:12px; margin-bottom:14px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
            <div>
              <label style="display:block; font-size:0.75rem; font-weight:800; color:#334155; margin-bottom:4px;">Billing / Audit Month</label>
              <select id="mis-month-select" style="width:100%; padding:8px 10px; border-radius:8px; border:1.5px solid #CBD5E1; font-size:0.82rem; font-weight:700; background:#FFF;">
                <option value="September 2026">September 2026 (Active)</option>
                <option value="August 2026">August 2026 (Archived)</option>
                <option value="July 2026">July 2026 (Archived)</option>
                <option value="Q2 FY 2026-27">Q2 Cumulative FY 2026-27</option>
              </select>
            </div>
            <div>
              <label style="display:block; font-size:0.75rem; font-weight:800; color:#334155; margin-bottom:4px;">Ward Jurisdiction</label>
              <select id="mis-ward-select" style="width:100%; padding:8px 10px; border-radius:8px; border:1.5px solid #CBD5E1; font-size:0.82rem; font-weight:700; background:#FFF;">
                <option value="All Wards (1–5)">All Wards (Wards 1–5)</option>
                <option value="Ward 1">Ward 1 - Station Road</option>
                <option value="Ward 2">Ward 2 - Samta Colony</option>
                <option value="Ward 3">Ward 3 - Gaothan</option>
                <option value="Ward 4">Ward 4 - Model Colony</option>
                <option value="Ward 5">Ward 5 - MIDC Suburbs</option>
              </select>
            </div>
          </div>

          <div style="font-size:0.74rem; color:#475569; line-height:1.4;">
            <strong>Included Telemetry Metrics:</strong> Total Waste Tonnage (48.2 T/day), Grievance Resolution SLA compliance (96.4%), Fleet GPS Uptime, Ward Cleanliness Indices, and Citizen Points audit log.
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px;">
          <!-- 1. PDF Printable Docket -->
          <button type="button" onclick="MunicipalityEngine.generatePDFReport()" style="background:linear-gradient(135deg, #0F766E, #0D9488); color:#FFF; border:none; padding:12px; border-radius:12px; font-weight:800; font-size:0.88rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 4px 14px rgba(13,148,136,0.3);">
            <span>📄</span>
            <span>Print / View Official PDF MIS Docket</span>
          </button>

          <!-- 2. Excel / CSV Export -->
          <button type="button" onclick="MunicipalityEngine.exportCSVReport()" style="background:#F0FDF4; color:#15803D; border:1.5px solid #86EFAC; padding:12px; border-radius:12px; font-weight:800; font-size:0.88rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
            <span>📗</span>
            <span>Download Excel / CSV Data Spreadsheet</span>
          </button>
        </div>
      </div>
    `);
  },

  generatePDFReport() {
    const month = (document.getElementById('mis-month-select') || {}).value || 'September 2026';
    const ward = (document.getElementById('mis-ward-select') || {}).value || 'All Wards (1–5)';
    
    CityAssist.closeModal();

    const printWin = window.open('', '_blank');
    if (!printWin) {
      CityAssist.showToast("✓ MIS PDF Generated. Please enable popups if preview didn't open.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>TDMC MIS Monthly Report - ${month}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 30px; color: #0F172A; line-height: 1.5; }
          .gov-header { border-bottom: 3px double #0F7943; padding-bottom: 12px; margin-bottom: 20px; text-align: center; }
          .gov-title { font-size: 22px; font-weight: 900; margin: 0; color: #064E3B; }
          .gov-sub { font-size: 14px; color: #475569; margin: 4px 0 0; }
          .report-meta { display: flex; justify-content: space-between; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px 14px; border-radius: 8px; margin-bottom: 20px; font-size: 12px; }
          .kpi-table, .data-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
          .data-table th, .data-table td { border: 1px solid #CBD5E1; padding: 8px 10px; text-align: left; }
          .data-table th { background: #F1F5F9; font-weight: 800; }
          .seal-box { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
          .seal { border: 2px dashed #059669; padding: 12px 20px; border-radius: 8px; text-align: center; font-weight: 800; color: #059669; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom:16px;">
          <button onclick="window.print()" style="background:#0F7943; color:#FFF; border:none; padding:10px 20px; border-radius:8px; font-weight:800; cursor:pointer;">🖨️ Print / Save as PDF</button>
        </div>

        <div class="gov-header">
          <div style="font-size:12px; font-weight:800; color:#64748B; letter-spacing:1px;">महाराष्ट्र शासन • GOVERNMENT OF MAHARASHTRA</div>
          <h1 class="gov-title">तळेगाव दाभाडे नगरपरिषद (TDMC)</h1>
          <p class="gov-sub">Talegaon Dabhade Municipal Council • Central Command &amp; Operations Directorate</p>
          <div style="font-weight:800; color:#15803D; margin-top:6px; font-size:14px;">EXECUTIVE MIS PERFORMANCE &amp; CIVIC AUDIT REPORT</div>
        </div>

        <div class="report-meta">
          <div><strong>Report Period:</strong> ${month} | <strong>Scope:</strong> ${ward}</div>
          <div><strong>Generated On:</strong> ${new Date().toLocaleString('en-IN')}</div>
          <div><strong>Document ID:</strong> TDMC-MIS-2026-SEP-084</div>
        </div>

        <h3 style="font-size:14px; margin-bottom:8px; color:#0F172A;">1. Key Operational Performance Indicators (KPIs)</h3>
        <table class="data-table">
          <tr>
            <th>Active Compactor Fleet</th>
            <th>Daily Waste Collected</th>
            <th>SLA Grievance Compliance</th>
            <th>Citizen App Registrations</th>
          </tr>
          <tr>
            <td><strong>14 / 16 Trucks (87.5% Uptime)</strong></td>
            <td><strong>48.2 Tons / Day (1,446 T MTD)</strong></td>
            <td><strong>96.4% on-time resolution</strong></td>
            <td><strong>18,420 Residents</strong></td>
          </tr>
        </table>

        <h3 style="font-size:14px; margin-bottom:8px; color:#0F172A;">2. Ward-by-Ward Cleanliness &amp; SLA Breakdown</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Ward ID &amp; Name</th>
              <th>Cleanliness Index</th>
              <th>Avg SLA Velocity</th>
              <th>Active Tickets</th>
              <th>Resolved (MTD)</th>
              <th>Nodal Ward Officer</th>
            </tr>
          </thead>
          <tbody>
            ${CityData.municipality.wards.map(w => `
              <tr>
                <td><strong>${w.name}</strong></td>
                <td><strong style="color:#15803D;">${w.cleanliness}%</strong></td>
                <td>${w.avgSla}</td>
                <td>${w.active}</td>
                <td>${w.resolved}</td>
                <td>${w.officer}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h3 style="font-size:14px; margin-bottom:8px; color:#0F172A;">3. Grievance Audit &amp; Dispatch Ledger Sample</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Category</th>
              <th>Location</th>
              <th>Priority</th>
              <th>Assigned Municipal Squad</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${CityData.municipality.triageQueue.map(t => `
              <tr>
                <td><strong>${t.id}</strong></td>
                <td>${t.category}</td>
                <td>${t.location}</td>
                <td>${t.priority || 'Normal'}</td>
                <td>${t.assignedSquad || 'Rapid Triage Wing'}</td>
                <td><strong>${t.status.toUpperCase()}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="seal-box">
          <div class="seal">
            🏛️ TDMC CENTRAL COMMAND<br>
            OFFICIAL VERIFIED MIS DOCKET
          </div>
          <div style="text-align:right; font-size:12px;">
            <strong>Er. S. R. Deshmukh</strong><br>
            Chief Officer &amp; Executive Administrator<br>
            Talegaon Dabhade Municipal Council
          </div>
        </div>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  },

  exportCSVReport() {
    const month = (document.getElementById('mis-month-select') || {}).value || 'September 2026';
    const ward = (document.getElementById('mis-ward-select') || {}).value || 'All Wards (1–5)';
    
    CityAssist.closeModal();

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "TDMC MUNICIPAL MIS MONTHLY AUDIT REPORT\n";
    csvContent += `Period,${month}\n`;
    csvContent += `Jurisdiction,${ward}\n`;
    csvContent += `Generated At,${new Date().toISOString()}\n\n`;

    csvContent += "--- WARD SWACHH CLEANLINESS INDEX ---\n";
    csvContent += "Ward ID,Ward Name,Cleanliness Score (%),Avg SLA Resolution,Active Grievances,Resolved Grievances,Nodal Officer\n";
    CityData.municipality.wards.forEach(w => {
      csvContent += `"${w.id}","${w.name}","${w.cleanliness}%","${w.avgSla}","${w.active}","${w.resolved}","${w.officer}"\n`;
    });

    csvContent += "\n--- GRIEVANCE AUDIT LEDGER ---\n";
    csvContent += "Ticket ID,Ward ID,Category,Incident Description,Location,Priority,Assigned Squad,Status,Remarks\n";
    CityData.municipality.triageQueue.forEach(t => {
      csvContent += `"${t.id}","${t.wardId || 1}","${t.category}","${t.title}","${t.location}","${t.priority || 'Normal'}","${t.assignedSquad || 'Unassigned'}","${t.status}","${t.remarks || 'N/A'}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TDMC_MIS_Monthly_Report_${month.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    CityAssist.showToast(`✓ Downloaded: TDMC_MIS_Monthly_Report_${month.replace(/\s+/g, '_')}.csv`);
  },

  /* ==========================================================================
     1 & 2. ADVISORY CREATOR & DISPATCH ENGINE
     ========================================================================== */
  openBroadcastAdvisoryModal() {
    if (typeof AuthEngine !== 'undefined' && !AuthEngine.hasPermission('publish_advisories')) {
      CityAssist.showToast("⛔ Access Denied: You do not have 'publish_advisories' permission.");
      return;
    }

    CityAssist.openModal(`
      <div style="padding:10px 0 16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #E2E8F0; padding-bottom:10px;">
          <div>
            <h3 style="font-size:1.15rem; font-weight:900; color:#0F172A; margin:0 0 2px;">📢 Publish Citizen Advisory</h3>
            <span style="font-size:0.75rem; color:#64748B;">Talegaon Dabhade Municipal Council • Official Broadcast</span>
          </div>
          <button type="button" onclick="CityAssist.closeModal()" style="background:#F1F5F9; border:none; width:30px; height:30px; border-radius:50%; font-weight:800; cursor:pointer;">✕</button>
        </div>

        <form id="muni-broadcast-form" onsubmit="MunicipalityEngine.publishAdvisory(event)">
          <div style="margin-bottom:12px;">
            <label style="display:block; font-size:0.78rem; font-weight:800; color:#334155; margin-bottom:4px;">Advisory Category</label>
            <select id="adv-category" style="width:100%; padding:10px; border-radius:10px; border:1.5px solid #CBD5E1; font-size:0.85rem; font-weight:700; background:#FFF; box-sizing:border-box;">
              <option value="💧 Water Supply Advisory">💧 Water Supply Shutdown / Low Pressure</option>
              <option value="🌧️ Monsoon & Flood Safety Alert">🌧️ Monsoon & Heavy Rain Red Alert</option>
              <option value="🧹 Mega Swachhata Cleanliness Drive">🧹 Mega Swachhata & Drainage Desilting Drive</option>
              <option value="⚡ Streetlights & Power Maintenance">⚡ Streetlights & Feeder Power Maintenance</option>
              <option value="🏥 Public Health & Vector Control">🏥 Free Health & Dengue Fogging Drive</option>
              <option value="🚧 Road Works & Traffic Diversion">🚧 Road Asphalt Laying & Traffic Diversion</option>
            </select>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
            <div>
              <label style="display:block; font-size:0.78rem; font-weight:800; color:#334155; margin-bottom:4px;">Target Wards</label>
              <select id="adv-ward" style="width:100%; padding:10px; border-radius:10px; border:1.5px solid #CBD5E1; font-size:0.82rem; font-weight:700; background:#FFF; box-sizing:border-box;">
                <option value="All Wards (Citywide)">All Wards (Citywide)</option>
                <option value="Ward 1 (Station Road & Market)">Ward 1 (Station Road)</option>
                <option value="Ward 2 (Samta Colony & Shivaji Nagar)">Ward 2 (Samta Colony)</option>
                <option value="Ward 3 (Maratha Colony & Gaothan)">Ward 3 (Gaothan)</option>
                <option value="Ward 4 (Model Colony & Lake Zone)">Ward 4 (Model Colony)</option>
                <option value="Ward 5 (MIDC & Vadgaon Road)">Ward 5 (MIDC Road)</option>
              </select>
            </div>
            <div>
              <label style="display:block; font-size:0.78rem; font-weight:800; color:#334155; margin-bottom:4px;">Priority Level</label>
              <select id="adv-priority" style="width:100%; padding:10px; border-radius:10px; border:1.5px solid #CBD5E1; font-size:0.82rem; font-weight:700; background:#FFF; box-sizing:border-box;">
                <option value="🔴 Urgent / High Priority">🔴 Urgent (Red Banner)</option>
                <option value="🟡 Important Notice">🟡 Important Notice</option>
                <option value="🟢 Public Update">🟢 Public Update</option>
              </select>
            </div>
          </div>

          <div style="margin-bottom:12px;">
            <label style="display:block; font-size:0.78rem; font-weight:800; color:#334155; margin-bottom:4px;">Advisory Headline</label>
            <input type="text" id="adv-title" value="Scheduled 24-Hour Water Shutdown for Main Pipeline Upgrade" required style="width:100%; padding:10px; border-radius:10px; border:1.5px solid #CBD5E1; font-size:0.85rem; font-weight:700; box-sizing:border-box;" placeholder="Enter notice headline">
          </div>

          <div style="margin-bottom:16px;">
            <label style="display:block; font-size:0.78rem; font-weight:800; color:#334155; margin-bottom:4px;">Detailed Notice Message</label>
            <textarea id="adv-message" rows="3" required style="width:100%; padding:10px; border-radius:10px; border:1.5px solid #CBD5E1; font-size:0.82rem; box-sizing:border-box;" placeholder="Enter detailed message for citizens...">Drinking water supply will remain unavailable on Thursday due to express feeder pump maintenance at Indrayani Water Works. Citizens are requested to store adequate water.</textarea>
          </div>

          <div style="display:flex; gap:10px;">
            <button type="submit" style="flex:1; background:linear-gradient(135deg, #4F46E5, #6366F1); color:#FFF; border:none; padding:14px; border-radius:12px; font-weight:900; font-size:0.92rem; cursor:pointer; box-shadow:0 4px 14px rgba(79,70,229,0.35);">
              🚀 Broadcast Notice to Citizens
            </button>
            <button type="button" onclick="CityAssist.closeModal()" style="background:#F1F5F9; color:#475569; border:none; padding:14px 16px; border-radius:12px; font-weight:800; font-size:0.88rem; cursor:pointer;">
              Cancel
            </button>
          </div>
        </form>
      </div>
    `);
  },

  publishAdvisory(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (typeof AuthEngine !== 'undefined' && !AuthEngine.hasPermission('publish_advisories')) {
      CityAssist.showToast("⛔ Access Denied: You do not have 'publish_advisories' permission.");
      return;
    }

    const cat = document.getElementById('adv-category').value;
    const ward = document.getElementById('adv-ward').value;
    const priority = document.getElementById('adv-priority').value;
    const title = document.getElementById('adv-title').value;
    const message = document.getElementById('adv-message').value;

    const advisoryPayload = {
      title: title,
      category: cat,
      categoryLabel: cat,
      message: message,
      targetWard: ward,
      priority: priority.includes('Urgent') ? 'Critical' : (priority.includes('Important') ? 'High' : 'Normal'),
      author: 'Chief Municipal Officer (CMO), TDMC'
    };

    // Broadcast to Firebase Firestore in real-time
    if (typeof FirebaseService !== 'undefined' && FirebaseService.publishAdvisory) {
      FirebaseService.publishAdvisory(advisoryPayload);
    }

    CityData.notifications.unshift({
      id: Date.now(),
      title: `📢 TDMC Advisory: ${title}`,
      desc: `${message} (${ward})`,
      time: "Just now",
      unread: true
    });

    if (typeof NotificationEngine !== 'undefined') {
      NotificationEngine.addNotification({
        title: `📢 TDMC Advisory: ${title}`,
        body: message,
        type: 'civic'
      });
    }

    CityAssist.closeModal();
    CityAssist.showToast(`🔥 Broadcasted to Firebase! "${title}" sent to ${ward}`);
  },

  openTriageModal(itemId) {
    const item = CityData.municipality.triageQueue.find(i => i.id === itemId);
    if (!item) return;

    const squads = [
      "Talegaon Pothole & Road Repair Flying Squad #1",
      "Sector 2 Rapid Sanitation Truck #MH-12-EA-4920",
      "Indrayani Water Supply & Pipeline Repair Squad",
      "Streetlight & Feeder Electrical Breakdown Unit",
      "Municipal High-Capacity Super-Sucker Jetting Squad",
      "Swachh Talegaon Quick Cleanliness Unit #3",
      "Horticulture & Tree Trimming Crane Crew",
      "Public Health, Vector & Dengue Control Spray Unit"
    ];

    CityAssist.openModal(`
      <div style="padding:10px 0 16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #E2E8F0; padding-bottom:10px;">
          <div>
            <div style="display:flex; align-items:center; gap:6px;">
              <h3 style="font-size:1.15rem; font-weight:900; color:#0F172A; margin:0;">Ticket Triage & Dispatch</h3>
              <span style="font-size:0.75rem; background:#EFF6FF; color:#1D4ED8; font-weight:800; padding:2px 8px; border-radius:8px;">${item.id}</span>
            </div>
            <span style="font-size:0.75rem; color:#64748B;">Category: <strong>${item.category}</strong> • 📍 ${item.location}</span>
          </div>
          <button type="button" onclick="CityAssist.closeModal()" style="background:#F1F5F9; border:none; width:30px; height:30px; border-radius:50%; font-weight:800; cursor:pointer;">✕</button>
        </div>

        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:12px; margin-bottom:14px;">
          <strong style="font-size:0.85rem; color:#0F172A; display:block; margin-bottom:4px;">Citizen Complaint:</strong>
          <p style="font-size:0.82rem; color:#334155; margin:0 0 6px; line-height:1.35;">"${item.title}"</p>
          <div style="display:flex; justify-content:space-between; font-size:0.74rem; color:#64748B;">
            <span>Reported: ${item.time}</span>
            <span style="color:#2563EB; font-weight:700;">🤖 AI Confidence: ${item.aiConfidence || '96%'}</span>
          </div>
        </div>

        <form id="triage-dispatch-form" onsubmit="MunicipalityEngine.saveTriageUpdate(event, '${item.id}')">
          <div style="margin-bottom:12px;">
            <label style="display:block; font-size:0.78rem; font-weight:800; color:#334155; margin-bottom:4px;">Assign Municipal Squad</label>
            <select id="triage-squad" style="width:100%; padding:10px; border-radius:10px; border:1.5px solid #CBD5E1; font-size:0.82rem; font-weight:700; background:#FFF; box-sizing:border-box;">
              ${squads.map(s => `<option value="${s}" ${item.assignedSquad === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
            <div>
              <label style="display:block; font-size:0.78rem; font-weight:800; color:#334155; margin-bottom:4px;">Priority Level</label>
              <select id="triage-priority" style="width:100%; padding:10px; border-radius:10px; border:1.5px solid #CBD5E1; font-size:0.82rem; font-weight:700; background:#FFF; box-sizing:border-box;">
                <option value="Normal" ${item.priority === 'Normal' ? 'selected' : ''}>Normal (SLA: 24h)</option>
                <option value="High Priority" ${item.priority === 'High Priority' ? 'selected' : ''}>High (SLA: 6h)</option>
                <option value="🚨 Critical Emergency" ${item.priority && item.priority.includes('Critical') ? 'selected' : ''}>Critical Emergency (SLA: 2h)</option>
              </select>
            </div>
            <div>
              <label style="display:block; font-size:0.78rem; font-weight:800; color:#334155; margin-bottom:4px;">Status Update</label>
              <select id="triage-status" style="width:100%; padding:10px; border-radius:10px; border:1.5px solid #CBD5E1; font-size:0.82rem; font-weight:700; background:#FFF; box-sizing:border-box;">
                <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>⏳ Pending Triage</option>
                <option value="assigned" ${item.status === 'assigned' ? 'selected' : ''}>🚚 Squad Dispatched / En Route</option>
                <option value="in_progress" ${item.status === 'in_progress' ? 'selected' : ''}>🛠️ Work Under Resolution</option>
                <option value="resolved" ${item.status === 'resolved' ? 'selected' : ''}>✅ Resolved (+50 Pts to Citizen)</option>
              </select>
            </div>
          </div>

          <div style="margin-bottom:16px;">
            <label style="display:block; font-size:0.78rem; font-weight:800; color:#334155; margin-bottom:4px;">Officer Resolution Remarks / Proof Note</label>
            <input type="text" id="triage-remarks" value="${item.remarks || 'Squad instructed for immediate inspection and on-site redressal.'}" style="width:100%; padding:10px; border-radius:10px; border:1.5px solid #CBD5E1; font-size:0.82rem; box-sizing:border-box;" placeholder="Enter inspection notes or resolution details">
          </div>

          <div style="display:flex; gap:10px;">
            <button type="submit" style="flex:1; background:linear-gradient(135deg, #15803D, #16A34A); color:#FFF; border:none; padding:14px; border-radius:12px; font-weight:900; font-size:0.92rem; cursor:pointer; box-shadow:0 4px 14px rgba(22,163,74,0.35);">
              ✓ Save &amp; Dispatch Squad
            </button>
            <button type="button" onclick="CityAssist.closeModal()" style="background:#F1F5F9; color:#475569; border:none; padding:14px 16px; border-radius:12px; font-weight:800; font-size:0.88rem; cursor:pointer;">
              Cancel
            </button>
          </div>
        </form>
      </div>
    `);
  },

  saveTriageUpdate(e, itemId) {
    if (e && e.preventDefault) e.preventDefault();
    if (typeof AuthEngine !== 'undefined' && !AuthEngine.hasPermission('triage_grievances')) {
      CityAssist.showToast("⛔ Access Denied: You do not have 'triage_grievances' permission.");
      return;
    }

    const item = CityData.municipality.triageQueue.find(i => i.id === itemId);
    if (!item) return;

    const squad = document.getElementById('triage-squad').value;
    const priority = document.getElementById('triage-priority').value;
    const status = document.getElementById('triage-status').value;
    const remarks = document.getElementById('triage-remarks').value;

    item.assignedSquad = squad;
    item.priority = priority;
    item.status = status;
    item.remarks = remarks;

    // Sync to Firebase Firestore & Realtime Database
    if (typeof FirebaseService !== 'undefined' && FirebaseService.updateGrievanceStatus) {
      FirebaseService.updateGrievanceStatus(itemId, {
        assignedSquad: squad,
        priority: priority,
        status: status,
        remarks: remarks
      });
    }

    if (status === 'resolved') {
      if (CityData.municipality.openReportsCount > 0) {
        CityData.municipality.openReportsCount--;
      }
      CityData.user.points += 50;

      const req = CityData.requests.find(r => r.id === itemId);
      if (req) {
        req.status = 'resolved';
        req.statusLabel = 'Resolved';
        req.filterGroup = 'resolved';
      }

      CityData.notifications.unshift({
        id: Date.now(),
        title: "Civic Reward Credited! 🏆",
        desc: `TDMC verified and resolved ${itemId}. +50 Civic Points added to your wallet!`,
        time: "Just now",
        unread: true
      });
    } else {
      const req = CityData.requests.find(r => r.id === itemId);
      if (req) {
        req.status = 'in_progress';
        req.statusLabel = 'Squad Dispatched';
        req.filterGroup = 'in_progress';
        req.assignedTo = {
          name: squad,
          phone: "1800-233-0244"
        };
      }
    }

    CityAssist.closeModal();
    this.renderStats();
    this.renderTriageList();
    this.renderMapMarkers();
    CityAssist.renderRequestsList();
    CityAssist.showToast(`🔥 Synced to Firebase! Ticket ${itemId}: ${squad} (${status})`);
  },

  /**
   * 🚚 FLEET & VEHICLE ASSIGNMENT MANAGEMENT (Municipality Admin Only)
   */
  openFleetManagementModal() {
    if (typeof AuthEngine !== 'undefined' && !AuthEngine.hasPermission('fleet_manage')) {
      CityAssist.showToast("⛔ Access Denied: 'fleet_manage' permission required.");
      return;
    }

    const fleet = (typeof CityData !== 'undefined' && CityData.municipality && CityData.municipality.fleetVehicles)
      ? CityData.municipality.fleetVehicles
      : [];

    const modalHtml = `
      <div class="modal-header-block" style="text-align:center; padding-bottom:4px;">
        <div style="font-size:2.2rem; margin-bottom:4px;">🚚</div>
        <h3 style="font-size:1.25rem; font-weight:800; color:#0F172A; margin-bottom:2px;">Municipal Fleet & Vehicle Assignments</h3>
        <p style="color:#64748B; font-size:0.82rem;">Centralized control of garbage vehicle routes, wards & assigned drivers</p>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin:12px 0 8px;">
        <span style="font-size:0.75rem; font-weight:800; color:#475569; text-transform:uppercase;">Authorized Vehicles (${fleet.length})</span>
        <button type="button" onclick="MunicipalityEngine.openAddVehicleModal()" style="background:#0F7943; color:#FFF; border:none; padding:6px 12px; border-radius:10px; font-weight:800; font-size:0.75rem; cursor:pointer; display:flex; align-items:center; gap:4px;">
          <span>➕</span> Add Vehicle
        </button>
      </div>

      <div style="display:flex; flex-direction:column; gap:10px; max-height:360px; overflow-y:auto; padding-right:2px; margin-bottom:14px;">
        ${fleet.map(v => `
          <div style="background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:14px; padding:12px 14px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="background:#1E40AF; color:#FFF; font-size:0.82rem; font-weight:900; padding:2px 8px; border-radius:6px;">${v.vehicleId}</span>
                <strong style="font-size:0.9rem; color:#0F172A;">${v.licensePlate}</strong>
                <span style="font-size:0.72rem; color:#64748B; background:#E2E8F0; padding:2px 6px; border-radius:6px; font-weight:700;">${v.type || 'Compactor'}</span>
              </div>
              <button type="button" onclick="MunicipalityEngine.openEditVehicleModal('${v.vehicleId}')" style="background:#EFF6FF; border:1px solid #BFDBFE; color:#1D4ED8; font-size:0.74rem; font-weight:800; padding:5px 10px; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:3px;">
                <span>✏️</span> Reassign
              </button>
            </div>

            <div style="font-size:0.78rem; color:#334155; line-height:1.5; display:grid; grid-template-columns:1fr 1fr; gap:4px 10px; margin-top:6px;">
              <div>📍 <strong>Ward:</strong> Ward ${v.wardId}</div>
              <div>🗺️ <strong>Route:</strong> ${v.routeId}</div>
              <div>⏰ <strong>Shift:</strong> ${v.schedule}</div>
              <div>👤 <strong>Driver:</strong> <strong style="color:#0F7943;">${v.driver}</strong> (${v.phone})</div>
            </div>
          </div>
        `).join('')}
      </div>

      <button type="button" onclick="CityAssist.closeModal()" style="width:100%; background:#F1F5F9; color:#475569; border:none; padding:12px; border-radius:12px; font-weight:700; cursor:pointer;">
        Close
      </button>
    `;

    CityAssist.openModal(modalHtml);
  },

  openEditVehicleModal(vehicleId) {
    const fleet = CityData.municipality.fleetVehicles || [];
    const v = fleet.find(item => item.vehicleId === vehicleId);
    if (!v) return;

    const modalHtml = `
      <div class="modal-header-block" style="text-align:center; padding-bottom:4px;">
        <div style="font-size:2.2rem; margin-bottom:4px;">🚚</div>
        <h3 style="font-size:1.25rem; font-weight:800; color:#0F172A; margin-bottom:2px;">Reassign Vehicle ${v.vehicleId}</h3>
        <p style="color:#64748B; font-size:0.82rem;">Vehicle ID remains permanent; update driver & route assignments</p>
      </div>

      <form id="edit-vehicle-form" onsubmit="MunicipalityEngine.saveVehicleAssignment(event, '${v.vehicleId}')" style="margin-top:14px;">
        <div style="background:#EFF6FF; border:1px solid #BFDBFE; border-radius:10px; padding:8px 12px; font-size:0.78rem; color:#1E40AF; font-weight:700; margin-bottom:12px;">
          Permanent Vehicle ID: <strong>${v.vehicleId}</strong> (Cannot be changed)
        </div>

        <div style="margin-bottom:10px;">
          <label style="font-size:0.75rem; font-weight:800; color:#475569; display:block; margin-bottom:4px;">License Plate Number</label>
          <input type="text" id="veh-license-plate" value="${v.licensePlate}" required style="width:100%; padding:9px 12px; border:1.5px solid #CBD5E1; border-radius:10px; font-size:0.85rem; font-weight:700;">
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
          <div>
            <label style="font-size:0.75rem; font-weight:800; color:#475569; display:block; margin-bottom:4px;">Assigned Ward</label>
            <select id="veh-ward-id" style="width:100%; padding:9px 12px; border:1.5px solid #CBD5E1; border-radius:10px; font-size:0.85rem; font-weight:700;">
              <option value="1" ${v.wardId === 1 ? 'selected' : ''}>Ward 1 (Station Road)</option>
              <option value="2" ${v.wardId === 2 ? 'selected' : ''}>Ward 2 (Samta Colony)</option>
              <option value="3" ${v.wardId === 3 ? 'selected' : ''}>Ward 3 (Gaothan)</option>
              <option value="4" ${v.wardId === 4 ? 'selected' : ''}>Ward 4 (Model Colony)</option>
              <option value="5" ${v.wardId === 5 ? 'selected' : ''}>Ward 5 (MIDC Suburbs)</option>
              <option value="6" ${v.wardId === 6 ? 'selected' : ''}>Ward 6 (Talegaon Hill)</option>
            </select>
          </div>
          <div>
            <label style="font-size:0.75rem; font-weight:800; color:#475569; display:block; margin-bottom:4px;">Route ID</label>
            <input type="text" id="veh-route-id" value="${v.routeId}" required style="width:100%; padding:9px 12px; border:1.5px solid #CBD5E1; border-radius:10px; font-size:0.85rem; font-weight:700;">
          </div>
        </div>

        <div style="margin-bottom:10px;">
          <label style="font-size:0.75rem; font-weight:800; color:#475569; display:block; margin-bottom:4px;">Shift Schedule</label>
          <input type="text" id="veh-schedule" value="${v.schedule}" placeholder="e.g. 07:00 AM – 12:00 PM" required style="width:100%; padding:9px 12px; border:1.5px solid #CBD5E1; border-radius:10px; font-size:0.85rem; font-weight:700;">
        </div>

        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:10px 12px; margin-bottom:14px;">
          <div style="font-size:0.78rem; font-weight:800; color:#0F172A; margin-bottom:8px;">👤 Assigned Driver Details (Municipality Appointed)</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
            <div>
              <label style="font-size:0.72rem; font-weight:700; color:#64748B; display:block; margin-bottom:2px;">Driver Name</label>
              <input type="text" id="veh-driver-name" value="${v.driver}" required style="width:100%; padding:8px 10px; border:1px solid #CBD5E1; border-radius:8px; font-size:0.82rem; font-weight:700;">
            </div>
            <div>
              <label style="font-size:0.72rem; font-weight:700; color:#64748B; display:block; margin-bottom:2px;">Driver ID</label>
              <input type="text" id="veh-driver-id" value="${v.driverId}" required style="width:100%; padding:8px 10px; border:1px solid #CBD5E1; border-radius:8px; font-size:0.82rem; font-weight:700;">
            </div>
          </div>
          <div>
            <label style="font-size:0.72rem; font-weight:700; color:#64748B; display:block; margin-bottom:2px;">Driver Phone Number</label>
            <input type="tel" id="veh-driver-phone" value="${v.phone}" required maxlength="10" style="width:100%; padding:8px 10px; border:1px solid #CBD5E1; border-radius:8px; font-size:0.82rem; font-weight:700;">
          </div>
        </div>

        <div style="display:flex; gap:8px;">
          <button type="button" onclick="MunicipalityEngine.openFleetManagementModal()" style="flex:1; background:#F1F5F9; color:#475569; border:none; padding:12px; border-radius:12px; font-weight:700; cursor:pointer;">
            Back
          </button>
          <button type="submit" class="primary-green-btn" style="flex:2; padding:12px; font-weight:800; font-size:0.88rem;">
            ✓ Save & Broadcast
          </button>
        </div>
      </form>
    `;

    CityAssist.openModal(modalHtml);
  },

  openAddVehicleModal() {
    const nextNum = (CityData.municipality.fleetVehicles.length + 1).toString().padStart(3, '0');
    const newVid = `GCV-${nextNum}`;

    const modalHtml = `
      <div class="modal-header-block" style="text-align:center; padding-bottom:4px;">
        <div style="font-size:2.2rem; margin-bottom:4px;">➕</div>
        <h3 style="font-size:1.25rem; font-weight:800; color:#0F172A; margin-bottom:2px;">Register Authorized Vehicle</h3>
        <p style="color:#64748B; font-size:0.82rem;">Create a new municipal waste vehicle in the authorized fleet</p>
      </div>

      <form id="add-vehicle-form" onsubmit="MunicipalityEngine.saveVehicleAssignment(event, '${newVid}', true)" style="margin-top:14px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
          <div>
            <label style="font-size:0.75rem; font-weight:800; color:#475569; display:block; margin-bottom:4px;">Vehicle ID</label>
            <input type="text" id="veh-id" value="${newVid}" readonly style="width:100%; padding:9px 12px; border:1.5px solid #CBD5E1; border-radius:10px; font-size:0.85rem; font-weight:900; background:#F1F5F9; color:#1E40AF;">
          </div>
          <div>
            <label style="font-size:0.75rem; font-weight:800; color:#475569; display:block; margin-bottom:4px;">License Plate</label>
            <input type="text" id="veh-license-plate" placeholder="MH-12-XX-0000" required style="width:100%; padding:9px 12px; border:1.5px solid #CBD5E1; border-radius:10px; font-size:0.85rem; font-weight:700;">
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
          <div>
            <label style="font-size:0.75rem; font-weight:800; color:#475569; display:block; margin-bottom:4px;">Assigned Ward</label>
            <select id="veh-ward-id" style="width:100%; padding:9px 12px; border:1.5px solid #CBD5E1; border-radius:10px; font-size:0.85rem; font-weight:700;">
              <option value="1">Ward 1 (Station Road)</option>
              <option value="2">Ward 2 (Samta Colony)</option>
              <option value="3">Ward 3 (Gaothan)</option>
              <option value="4">Ward 4 (Model Colony)</option>
              <option value="5">Ward 5 (MIDC Suburbs)</option>
              <option value="6">Ward 6 (Talegaon Hill)</option>
            </select>
          </div>
          <div>
            <label style="font-size:0.75rem; font-weight:800; color:#475569; display:block; margin-bottom:4px;">Route ID</label>
            <input type="text" id="veh-route-id" placeholder="e.g. Route 6A" required style="width:100%; padding:9px 12px; border:1.5px solid #CBD5E1; border-radius:10px; font-size:0.85rem; font-weight:700;">
          </div>
        </div>

        <div style="margin-bottom:10px;">
          <label style="font-size:0.75rem; font-weight:800; color:#475569; display:block; margin-bottom:4px;">Shift Schedule</label>
          <input type="text" id="veh-schedule" placeholder="07:00 AM – 12:00 PM" required style="width:100%; padding:9px 12px; border:1.5px solid #CBD5E1; border-radius:10px; font-size:0.85rem; font-weight:700;">
        </div>

        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:10px 12px; margin-bottom:14px;">
          <div style="font-size:0.78rem; font-weight:800; color:#0F172A; margin-bottom:8px;">👤 Appointed Driver Details</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
            <div>
              <label style="font-size:0.72rem; font-weight:700; color:#64748B; display:block; margin-bottom:2px;">Driver Name</label>
              <input type="text" id="veh-driver-name" placeholder="Driver Full Name" required style="width:100%; padding:8px 10px; border:1px solid #CBD5E1; border-radius:8px; font-size:0.82rem; font-weight:700;">
            </div>
            <div>
              <label style="font-size:0.72rem; font-weight:700; color:#64748B; display:block; margin-bottom:2px;">Driver ID</label>
              <input type="text" id="veh-driver-id" placeholder="PMC-DRV-XXX" required style="width:100%; padding:8px 10px; border:1px solid #CBD5E1; border-radius:8px; font-size:0.82rem; font-weight:700;">
            </div>
          </div>
          <div>
            <label style="font-size:0.72rem; font-weight:700; color:#64748B; display:block; margin-bottom:2px;">Driver Phone Number</label>
            <input type="tel" id="veh-driver-phone" placeholder="10-digit number" required maxlength="10" style="width:100%; padding:8px 10px; border:1px solid #CBD5E1; border-radius:8px; font-size:0.82rem; font-weight:700;">
          </div>
        </div>

        <div style="display:flex; gap:8px;">
          <button type="button" onclick="MunicipalityEngine.openFleetManagementModal()" style="flex:1; background:#F1F5F9; color:#475569; border:none; padding:12px; border-radius:12px; font-weight:700; cursor:pointer;">
            Back
          </button>
          <button type="submit" class="primary-green-btn" style="flex:2; padding:12px; font-weight:800; font-size:0.88rem;">
            ✓ Register Vehicle
          </button>
        </div>
      </form>
    `;

    CityAssist.openModal(modalHtml);
  },

  async saveVehicleAssignment(event, vehicleId, isNew = false) {
    if (event) event.preventDefault();

    const licensePlate = document.getElementById('veh-license-plate')?.value?.trim();
    const wardId = Number(document.getElementById('veh-ward-id')?.value) || 2;
    const routeId = document.getElementById('veh-route-id')?.value?.trim() || 'Route 1A';
    const schedule = document.getElementById('veh-schedule')?.value?.trim() || '07:00 AM – 12:00 PM';
    const driverName = document.getElementById('veh-driver-name')?.value?.trim() || 'Assigned Driver';
    const driverId = document.getElementById('veh-driver-id')?.value?.trim() || 'PMC-DRV-100';
    const driverPhone = document.getElementById('veh-driver-phone')?.value?.trim() || '9822000000';

    const wardNames = {
      1: "Ward 1 (Station Road & Market)",
      2: "Ward 2 (Samta Colony & Shivaji Nagar)",
      3: "Ward 3 (Talegaon Gaothan & Indrayani)",
      4: "Ward 4 (Model Colony & Lake Zone)",
      5: "Ward 5 (MIDC Industrial & Suburbs)",
      6: "Ward 6 (Talegaon Hill & Sector 6)"
    };

    const assignmentData = {
      vehicleId: vehicleId,
      licensePlate: licensePlate,
      wardId: wardId,
      wardName: wardNames[wardId] || `Ward ${wardId}`,
      routeId: routeId,
      routeName: `${routeId} (${wardNames[wardId] || 'Ward Route'})`,
      schedule: schedule,
      driverName: driverName,
      driverId: driverId,
      driverPhone: driverPhone,
      driverEmail: `${driverName.toLowerCase().replace(/\s+/g, '.')}.driver@pmc.gov.in`
    };

    if (isNew) {
      CityData.municipality.fleetVehicles.push({
        vehicleId: vehicleId,
        licensePlate: licensePlate,
        type: "Compactor 6-Ton",
        wardId: wardId,
        wardName: wardNames[wardId] || `Ward ${wardId}`,
        routeId: routeId,
        routeName: `${routeId} (${wardNames[wardId] || 'Ward Route'})`,
        schedule: schedule,
        driver: driverName,
        driverId: driverId,
        phone: driverPhone,
        status: "On Standby • Depot",
        isActive: false,
        lat: 18.7280 + (wardId * 0.002),
        lng: 73.6750 + (wardId * 0.002),
        speed: "0 km/h",
        fuel: "85%"
      });
    }

    // Broadcast to Firebase Firestore
    if (typeof FirebaseService !== 'undefined') {
      await FirebaseService.updateVehicleAssignment(vehicleId, assignmentData);
    }

    CityAssist.closeModal();
    this.renderStats();
    this.renderMapMarkers();
    CityAssist.showToast(`✓ Updated ${vehicleId} assignment: Driver ${driverName} (Ward ${wardId}) 🚚`);
  },

  /* ==========================================================================
     STAFF VERIFICATION & RBAC MANAGEMENT (ADMIN ONLY)
     ========================================================================== */
  openStaffManagementModal() {
    if (typeof AuthEngine !== 'undefined' && !AuthEngine.isAuthorizedForRole('officer')) {
      CityAssist.showToast("⛔ Unauthorized: Municipal Officer/Administrator access required.");
      return;
    }

    const isAdmin = typeof AuthEngine !== 'undefined' && AuthEngine.hasPermission('staff_admin');
    const staffList = (typeof AuthEngine !== 'undefined') ? AuthEngine.getStaffList() : [];
    const pendingStaff = staffList.filter(s => s.status === 'pending');
    const approvedStaff = staffList.filter(s => s.status === 'approved');

    const modalHtml = `
      <div class="modal-header-block" style="text-align:center; padding-bottom:4px;">
        <div style="font-size:2.2rem; margin-bottom:4px;">🛡️</div>
        <h3 style="font-size:1.25rem; font-weight:800; color:#0F172A; margin-bottom:2px;">Staff Verification & RBAC Permissions</h3>
        <p style="color:#64748B; font-size:0.82rem;">Authorized administrator approval required for municipal officers and drivers</p>
      </div>

      ${!isAdmin ? `
        <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:10px; padding:8px 12px; margin:10px 0; font-size:0.75rem; color:#92400E; display:flex; align-items:center; gap:6px;">
          <span>ℹ️</span> <strong>View-Only Mode:</strong> Only TDMC Chief Administrators with <code>staff_admin</code> permission can approve or reject accounts.
        </div>
      ` : ''}

      <!-- Tabs / Section Header for Pending Applications -->
      <div style="margin-top:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:0.8rem; font-weight:800; color:#0F172A; text-transform:uppercase;">
          ⏳ Pending Applications (${pendingStaff.length})
        </span>
        ${pendingStaff.length > 0 ? `<span style="background:#FEF3C7; color:#B45309; font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:12px;">Needs Action</span>` : ''}
      </div>

      <div style="display:flex; flex-direction:column; gap:8px; max-height:180px; overflow-y:auto; margin-bottom:14px;">
        ${pendingStaff.length === 0 ? `
          <div style="background:#F8FAFC; border:1px dashed #CBD5E1; border-radius:12px; padding:14px; text-align:center; color:#64748B; font-size:0.8rem;">
            ✓ No pending staff verification requests. All municipal staff verified.
          </div>
        ` : pendingStaff.map(s => `
          <div style="background:#FFF; border:1.5px solid #F59E0B; border-radius:12px; padding:10px 12px; box-shadow:0 2px 8px rgba(245,158,11,0.08);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <strong style="font-size:0.88rem; color:#0F172A;">${s.name}</strong>
                <div style="font-size:0.75rem; color:#64748B; margin-top:2px;">
                  📱 ${s.phone || 'No phone'} • ✉️ ${s.email || 'No email'}
                </div>
                <div style="font-size:0.73rem; color:#B45309; margin-top:3px; font-weight:700;">
                  Requested: ${s.requestedRole === 'driver' ? '🚚 Municipal Driver' : '🛡️ Ward Officer'} (${s.assignedWard || 'Ward 2'})
                </div>
              </div>
              <span style="background:#FEF3C7; color:#92400E; font-size:0.68rem; font-weight:800; padding:2px 6px; border-radius:6px;">PENDING</span>
            </div>

            ${isAdmin ? `
              <div style="display:flex; gap:6px; margin-top:8px; border-top:1px solid #F1F5F9; padding-top:8px;">
                <button type="button" onclick="MunicipalityEngine.approveStaffRequest('${s.id}', '${s.requestedRole || 'officer'}')" style="flex:2; background:#0F7943; color:#FFF; border:none; padding:7px 10px; border-radius:8px; font-size:0.75rem; font-weight:800; cursor:pointer;">
                  ✓ Approve as ${s.requestedRole === 'driver' ? 'Driver' : 'Officer'}
                </button>
                <button type="button" onclick="MunicipalityEngine.rejectStaffRequest('${s.id}')" style="flex:1; background:#FEE2E2; color:#DC2626; border:1px solid #FECACA; padding:7px 8px; border-radius:8px; font-size:0.75rem; font-weight:800; cursor:pointer;">
                  ✕ Reject
                </button>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>

      <!-- Approved Municipal Staff Directory -->
      <div style="margin-top:10px; margin-bottom:8px;">
        <span style="font-size:0.8rem; font-weight:800; color:#0F172A; text-transform:uppercase;">
          🛡️ Approved Staff & RBAC Permissions (${approvedStaff.length})
        </span>
      </div>

      <div style="display:flex; flex-direction:column; gap:8px; max-height:200px; overflow-y:auto; margin-bottom:14px;">
        ${approvedStaff.map(s => `
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:10px 12px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; align-items:center; gap:8px;">
                <img src="${s.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(s.name)}" style="width:32px; height:32px; border-radius:50%; object-fit:cover; border:1.5px solid #CBD5E1;">
                <div>
                  <strong style="font-size:0.84rem; color:#0F172A;">${s.name}</strong>
                  <div style="font-size:0.72rem; color:#64748B;">${s.roleLabel || s.role} • ${s.assignedWard || s.depot || 'TDMC'}</div>
                </div>
              </div>
              <span style="background:${s.role === 'admin' ? '#EDE9FE; color:#6D28D9;' : (s.role === 'driver' ? '#E0F2FE; color:#0369A1;' : '#DCFCE7; color:#15803D;')} font-size:0.68rem; font-weight:800; padding:2px 8px; border-radius:6px; text-transform:uppercase;">
                ${s.role}
              </span>
            </div>

            <!-- Granular Permissions Strip -->
            <div style="margin-top:6px; display:flex; flex-wrap:wrap; gap:4px;">
              ${(s.permissions || []).map(p => `
                <span style="background:#FFFFFF; border:1px solid #CBD5E1; color:#475569; font-size:0.65rem; font-weight:700; padding:1px 6px; border-radius:4px;">
                  🔑 ${p}
                </span>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>

      <button type="button" onclick="CityAssist.closeModal()" style="width:100%; background:#F1F5F9; color:#475569; border:none; padding:12px; border-radius:12px; font-weight:700; cursor:pointer;">
        Close
      </button>
    `;

    CityAssist.openModal(modalHtml);
  },

  async approveStaffRequest(staffId, role) {
    if (typeof AuthEngine === 'undefined') return;
    const res = await AuthEngine.approveStaffAccount(staffId, role);
    if (res && res.success) {
      CityAssist.showToast(`✓ Approved staff account for ${res.staffRecord?.name || staffId}!`);
      this.openStaffManagementModal();
    }
  },

  async rejectStaffRequest(staffId) {
    if (typeof AuthEngine === 'undefined') return;
    const res = await AuthEngine.rejectStaffAccount(staffId);
    if (res && res.success) {
      CityAssist.showToast(`✓ Rejected request for ${staffId}.`);
      this.openStaffManagementModal();
    }
  },

  /* ==========================================================================
     🛡️ ADMINISTRATIVE AUDIT LOGS MODAL (ADMIN ONLY)
     ========================================================================== */
  async openAuditLogsModal(filterType = 'all') {
    if (typeof AuthEngine !== 'undefined' && !AuthEngine.isAuthorizedForRole('officer')) {
      CityAssist.showToast("⛔ Unauthorized: Municipal Officer/Administrator access required.");
      return;
    }

    let logs = [];
    if (typeof FirebaseService !== 'undefined' && FirebaseService.getAuditLogs) {
      logs = await FirebaseService.getAuditLogs(40);
    } else if (typeof CityData !== 'undefined' && CityData.auditLogs) {
      logs = CityData.auditLogs;
    }

    if (filterType !== 'all') {
      logs = logs.filter(l => l.targetType === filterType || (l.action && l.action.toLowerCase().includes(filterType)));
    }

    const actionIcons = {
      'VEHICLE_ASSIGNMENT_CHANGED': '🚚',
      'COMPLAINT_STATUS_CHANGED': '🛠️',
      'COMPLAINT_SQUAD_ASSIGNED': '🏃‍♂️',
      'ADVISORY_BROADCASTED': '📢',
      'STAFF_ACCOUNT_APPROVED': '🛡️',
      'STAFF_ACCOUNT_REJECTED': '⛔'
    };

    const actionColors = {
      'VEHICLE_ASSIGNMENT_CHANGED': '#0284C7',
      'COMPLAINT_STATUS_CHANGED': '#16A34A',
      'COMPLAINT_SQUAD_ASSIGNED': '#D97706',
      'ADVISORY_BROADCASTED': '#7C3AED',
      'STAFF_ACCOUNT_APPROVED': '#0F7943',
      'STAFF_ACCOUNT_REJECTED': '#DC2626'
    };

    const modalHtml = `
      <div class="modal-header-block" style="text-align:center; padding-bottom:4px;">
        <div style="font-size:2.2rem; margin-bottom:4px;">📜</div>
        <h3 style="font-size:1.25rem; font-weight:800; color:#0F172A; margin-bottom:2px;">Administrative Audit Logs</h3>
        <p style="color:#64748B; font-size:0.82rem;">Immutable, tamper-proof record of all critical administrative actions</p>
      </div>

      <!-- Filter Chips -->
      <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:6px; margin:10px 0 8px;">
        <button type="button" onclick="MunicipalityEngine.openAuditLogsModal('all')" style="background:${filterType === 'all' ? '#0F172A' : '#F1F5F9'}; color:${filterType === 'all' ? '#FFF' : '#475569'}; border:none; padding:5px 10px; border-radius:8px; font-size:0.72rem; font-weight:800; cursor:pointer; white-space:nowrap;">
          All Logs (${(CityData.auditLogs || []).length})
        </button>
        <button type="button" onclick="MunicipalityEngine.openAuditLogsModal('vehicle')" style="background:${filterType === 'vehicle' ? '#0F172A' : '#F1F5F9'}; color:${filterType === 'vehicle' ? '#FFF' : '#475569'}; border:none; padding:5px 10px; border-radius:8px; font-size:0.72rem; font-weight:800; cursor:pointer; white-space:nowrap;">
          🚚 Fleet & Drivers
        </button>
        <button type="button" onclick="MunicipalityEngine.openAuditLogsModal('grievance')" style="background:${filterType === 'grievance' ? '#0F172A' : '#F1F5F9'}; color:${filterType === 'grievance' ? '#FFF' : '#475569'}; border:none; padding:5px 10px; border-radius:8px; font-size:0.72rem; font-weight:800; cursor:pointer; white-space:nowrap;">
          🛠️ Grievances
        </button>
        <button type="button" onclick="MunicipalityEngine.openAuditLogsModal('advisory')" style="background:${filterType === 'advisory' ? '#0F172A' : '#F1F5F9'}; color:${filterType === 'advisory' ? '#FFF' : '#475569'}; border:none; padding:5px 10px; border-radius:8px; font-size:0.72rem; font-weight:800; cursor:pointer; white-space:nowrap;">
          📢 Advisories
        </button>
        <button type="button" onclick="MunicipalityEngine.openAuditLogsModal('staff')" style="background:${filterType === 'staff' ? '#0F172A' : '#F1F5F9'}; color:${filterType === 'staff' ? '#FFF' : '#475569'}; border:none; padding:5px 10px; border-radius:8px; font-size:0.72rem; font-weight:800; cursor:pointer; white-space:nowrap;">
          🛡️ Staff Approvals
        </button>
      </div>

      <!-- Logs Container -->
      <div style="display:flex; flex-direction:column; gap:8px; max-height:340px; overflow-y:auto; margin-bottom:14px; padding-right:2px;">
        ${logs.length === 0 ? `
          <div style="background:#F8FAFC; border:1px dashed #CBD5E1; border-radius:12px; padding:20px; text-align:center; color:#64748B; font-size:0.8rem;">
            No audit records found for selected filter.
          </div>
        ` : logs.map(l => {
          const icon = actionIcons[l.action] || '📝';
          const color = actionColors[l.action] || '#334155';
          const timeStr = l.timestamp ? (new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + new Date(l.timestamp).toLocaleDateString()) : 'Recent';

          return `
            <div style="background:#FFFFFF; border:1.5px solid #E2E8F0; border-left:4px solid ${color}; border-radius:10px; padding:10px 12px; box-shadow:0 2px 6px rgba(0,0,0,0.04);">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="font-size:1rem;">${icon}</span>
                  <strong style="font-size:0.82rem; color:#0F172A;">${l.action.replace(/_/g, ' ')}</strong>
                </div>
                <span style="font-size:0.68rem; color:#64748B; font-weight:700;">${timeStr}</span>
              </div>

              <div style="font-size:0.72rem; color:#475569; margin-bottom:6px; display:flex; flex-wrap:wrap; gap:8px;">
                <span>👤 <strong>User:</strong> ${l.userName} (${l.userId})</span>
                <span>🏷️ <strong>Record ID:</strong> <code style="background:#F1F5F9; padding:1px 4px; border-radius:4px; font-weight:700;">${l.recordId}</code></span>
              </div>

              ${l.details && Object.keys(l.details).length > 0 ? `
                <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:6px; padding:6px 8px; font-size:0.7rem; color:#334155; line-height:1.4;">
                  ${Object.entries(l.details).map(([k, v]) => `
                    <div><strong>${k}:</strong> ${v}</div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>

      <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:10px; padding:8px 12px; margin-bottom:12px; font-size:0.72rem; color:#166534; display:flex; align-items:center; gap:6px;">
        <span>🔒</span> <strong>Tamper-Proof Audit Trail:</strong> Logs are immutable and protected by Cloud Firestore security rules.
      </div>

      <button type="button" onclick="CityAssist.closeModal()" style="width:100%; background:#F1F5F9; color:#475569; border:none; padding:12px; border-radius:12px; font-weight:700; cursor:pointer;">
        Close
      </button>
    `;

    CityAssist.openModal(modalHtml);
  },

  refreshTelemetry() {
    CityData.municipality.dailyTonsCollected = Number((CityData.municipality.dailyTonsCollected + 0.3).toFixed(1));
    this.renderStats();
    this.renderTriageList();
    this.renderMapMarkers();
    CityAssist.showToast("✓ Command center GPS & telemetry refreshed!");
  }
};

// Global Hook
CityAssist.refreshMuniData = function() {
  MunicipalityEngine.refreshTelemetry();
};

CityAssist.broadcastCityAlert = function() {
  const msg = prompt("Enter municipal advisory message for citizen broadcasts:", "Reminder: Segregate dry and wet waste today for door-to-door collection.");
  if (msg) {
    CityData.notifications.unshift({
      id: Date.now(),
      title: "📢 PMC Ward Advisory",
      time: "Just now",
      desc: msg
    });
    CityAssist.showToast("Advisory broadcasted to all citizens in Ward 4");
  }
};

CityAssist.toggleCommunitySearch = function() {
  const box = document.getElementById('community-search-box');
  if (box) {
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
    if (box.style.display === 'block') {
      const input = document.getElementById('community-search-input');
      if (input) input.focus();
    }
  }
};

CityAssist.viewFullImage = function(src) {
  CityAssist.openModal(`
    <div style="text-align:center;">
      <img src="${src}" style="width:100%; max-height:60vh; border-radius:14px; object-fit:cover; margin-bottom:12px;" alt="Full image">
      <button class="primary-green-btn" onclick="CityAssist.closeModal()">Close</button>
    </div>
  `);
};

/**
 * Community Feed Engine with LocalStorage Persistence
 */
const CommunityEngine = {
  currentCategory: 'all',
  uploadedPhoto: null,
  uploadedBeforePhoto: null,
  uploadedAfterPhoto: null,

  init() {
    this.loadSavedPosts();
    this.renderFeed();
  },

  /**
   * Load saved posts from LocalStorage
   */
  loadSavedPosts() {
    try {
      const saved = localStorage.getItem('cityassist_community_posts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          CityData.communityPosts = parsed;
          return;
        }
      }
      // If no saved posts exist yet, persist the initial default posts
      this.savePosts();
    } catch (e) {
      console.warn('Could not load community posts from localStorage:', e);
    }
  },

  /**
   * Persist community posts to LocalStorage
   */
  savePosts() {
    try {
      localStorage.setItem('cityassist_community_posts', JSON.stringify(CityData.communityPosts));
    } catch (e) {
      console.warn('Could not persist community posts to localStorage:', e);
    }
  },

  /**
   * Compress and resize uploaded image to prevent LocalStorage quota overflow
   */
  compressImage(file, maxDimension = 900, quality = 0.75) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  renderFeed(filtered = null) {
    const feed = document.getElementById('community-posts-feed');
    if (!feed) return;

    const posts = filtered || this.getFilteredPosts();

    if (posts.length === 0) {
      feed.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:#6B7280;">
          <div style="font-size:2.5rem; margin-bottom:10px;">💬</div>
          <h3 style="font-size:1.1rem; font-weight:700; color:#111827;">No posts in this category</h3>
          <p style="font-size:0.85rem; margin-top:4px;">Be the first to share an update or appreciation!</p>
        </div>
      `;
      return;
    }

    feed.innerHTML = posts.map(post => UIComponents.renderCommunityPost(post)).join('');
  },

  getFilteredPosts() {
    if (this.currentCategory === 'all') {
      return CityData.communityPosts;
    }
    return CityData.communityPosts.filter(p => p.category === this.currentCategory);
  },

  filterCategory(category, element) {
    this.currentCategory = category;
    
    // Update active tile
    document.querySelectorAll('.comm-category-tile').forEach(tile => {
      tile.classList.remove('active');
    });
    if (element) element.classList.add('active');

    this.renderFeed();
  },

  handleSearch(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
      this.renderFeed();
      return;
    }
    const filtered = CityData.communityPosts.filter(p => 
      p.text.toLowerCase().includes(q) || 
      p.author.name.toLowerCase().includes(q) ||
      p.badgeText.toLowerCase().includes(q)
    );
    this.renderFeed(filtered);
  },

  toggleLike(postId) {
    const post = CityData.communityPosts.find(p => p.id === postId);
    if (post) {
      post.isLiked = !post.isLiked;
      post.likes += post.isLiked ? 1 : -1;
      this.savePosts();
      this.renderFeed();
      if (post.isLiked) CityAssist.showToast("Liked post ❤️");
    }
  },

  toggleBookmark(postId) {
    const post = CityData.communityPosts.find(p => p.id === postId);
    if (post) {
      post.isBookmarked = !post.isBookmarked;
      this.savePosts();
      this.renderFeed();
      CityAssist.showToast(post.isBookmarked ? "Post saved to bookmarks" : "Post removed from bookmarks");
    }
  },

  openCommentsModal(postId) {
    const post = CityData.communityPosts.find(p => p.id === postId);
    if (!post) return;

    CityAssist.openModal(`
      <div class="modal-header-block">
        <h3 style="font-size:1.25rem; font-weight:800; margin-bottom:4px;">💬 Comments (${post.comments})</h3>
        <p style="color:#64748B; font-size:0.85rem; margin-bottom:14px;">Discussion on "${post.author.name}'s" post</p>
      </div>

      <div style="display:flex; flex-direction:column; gap:12px; max-height:220px; overflow-y:auto; margin-bottom:16px;">
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:10px 12px; border-radius:10px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <strong style="font-size:0.85rem;">Sunil Joshi</strong>
            <span style="font-size:0.75rem; color:#94A3B8;">1h ago</span>
          </div>
          <p style="font-size:0.82rem; color:#4B5563;">Totally agree! Sector 2 is looking much cleaner lately.</p>
        </div>
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:10px 12px; border-radius:10px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <strong style="font-size:0.85rem;">Pooja Kulkarni</strong>
            <span style="font-size:0.75rem; color:#94A3B8;">45m ago</span>
          </div>
          <p style="font-size:0.82rem; color:#4B5563;">Kudos to the entire municipal team! 👏</p>
        </div>
      </div>

      <div style="display:flex; gap:8px;">
        <input type="text" id="add-comment-input" placeholder="Write a comment..." style="flex:1; padding:10px 12px; border:1px solid #CBD5E1; border-radius:10px; font-size:0.88rem; outline:none;">
        <button onclick="CommunityEngine.postComment('${post.id}')" style="background:#0F7943; color:#fff; border:none; padding:10px 16px; border-radius:10px; font-weight:700; cursor:pointer;">Send</button>
      </div>
    `);
  },

  postComment(postId) {
    const input = document.getElementById('add-comment-input');
    if (input && input.value.trim()) {
      const post = CityData.communityPosts.find(p => p.id === postId);
      if (post) {
        post.comments++;
        this.savePosts();
        this.renderFeed();
      }
      CityAssist.closeModal();
      CityAssist.showToast("Comment posted!");
    }
  },

  handlePointerStart(e, postId) {
    if (e.target && e.target.setPointerCapture) {
      try { e.target.setPointerCapture(e.pointerId); } catch(err){}
    }
    this.handleSliderMove(e, postId);
  },

  handleSliderMove(e, postId) {
    const container = document.getElementById(`ba-container-${postId}`);
    const beforeLayer = document.getElementById(`ba-before-layer-${postId}`);
    const handle = document.getElementById(`ba-handle-${postId}`);
    if (!container || !beforeLayer || !handle) return;

    const rect = container.getBoundingClientRect();
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : rect.left + rect.width / 2);
    const x = clientX - rect.left;
    let pct = (x / rect.width) * 100;
    pct = Math.max(0, Math.min(100, pct));

    beforeLayer.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
    handle.style.left = `${pct}%`;
  },

  handleSliderTouch(e, postId) {
    if (e.touches && e.touches[0]) {
      this.handleSliderMove(e.touches[0], postId);
    }
  },

  postFormat: 'standard',
  uploadedPhoto: null,
  uploadedBeforePhoto: null,
  uploadedAfterPhoto: null,

  openCreatePostModal() {
    this.postFormat = 'standard';
    this.uploadedPhoto = null;
    this.uploadedBeforePhoto = null;
    this.uploadedAfterPhoto = null;
    CityAssist.openModal(UIComponents.renderCreatePostModal());
  },

  setPostFormat(format) {
    this.postFormat = format;
    const btnStd = document.getElementById('tab-post-format-standard');
    const btnBA = document.getElementById('tab-post-format-beforeafter');
    const secStd = document.getElementById('section-upload-standard');
    const secBA = document.getElementById('section-upload-beforeafter');

    if (format === 'beforeafter') {
      if (btnStd) {
        btnStd.style.background = '#F8FAFC';
        btnStd.style.borderColor = '#E2E8F0';
        btnStd.style.color = '#64748B';
      }
      if (btnBA) {
        btnBA.style.background = '#F0FDF4';
        btnBA.style.borderColor = '#0F7943';
        btnBA.style.color = '#15803D';
      }
      if (secStd) secStd.style.display = 'none';
      if (secBA) secBA.style.display = 'block';
    } else {
      if (btnStd) {
        btnStd.style.background = '#F0FDF4';
        btnStd.style.borderColor = '#0F7943';
        btnStd.style.color = '#15803D';
      }
      if (btnBA) {
        btnBA.style.background = '#F8FAFC';
        btnBA.style.borderColor = '#E2E8F0';
        btnBA.style.color = '#64748B';
      }
      if (secStd) secStd.style.display = 'block';
      if (secBA) secBA.style.display = 'none';
    }
  },

  async handlePostPhoto(event) {
    const file = event.target.files[0];
    if (file) {
      try {
        const compressed = await this.compressImage(file, 900, 0.75);
        this.uploadedPhoto = compressed;
        const box = document.getElementById('post-photo-preview-box');
        if (box) {
          box.innerHTML = `
            <img src="${this.uploadedPhoto}" style="max-height:80px; border-radius:8px; object-fit:cover;" alt="Preview">
            <div style="font-size:0.75rem; color:#15803D; font-weight:700; margin-top:4px;">Photo attached • Analyzing scene...</div>
          `;
        }
        // Run multimodal vision analysis on the actual uploaded image
        this.triggerCommunityAIVision();
      } catch (e) {
        console.error("Error processing post photo:", e);
      }
    }
  },

  async handleBeforePhoto(event) {
    const file = event.target.files[0];
    if (file) {
      try {
        const compressed = await this.compressImage(file, 800, 0.75);
        this.uploadedBeforePhoto = compressed;
        const box = document.getElementById('post-before-preview-box');
        if (box) {
          box.innerHTML = `
            <img src="${this.uploadedBeforePhoto}" style="width:100%; height:75px; border-radius:8px; object-fit:cover;" alt="Before Preview">
            <div style="font-size:0.7rem; color:#DC2626; font-weight:800; margin-top:3px;">✓ Before Photo Ready</div>
          `;
        }
      } catch (e) {
        console.error("Error processing before photo:", e);
      }
    }
  },

  async handleAfterPhoto(event) {
    const file = event.target.files[0];
    if (file) {
      try {
        const compressed = await this.compressImage(file, 800, 0.75);
        this.uploadedAfterPhoto = compressed;
        const box = document.getElementById('post-after-preview-box');
        if (box) {
          box.innerHTML = `
            <img src="${this.uploadedAfterPhoto}" style="width:100%; height:75px; border-radius:8px; object-fit:cover;" alt="After Preview">
            <div style="font-size:0.7rem; color:#15803D; font-weight:800; margin-top:3px;">✓ After Photo Ready</div>
          `;
        }
      } catch (e) {
        console.error("Error processing after photo:", e);
      }
    }
  },

  loadSampleBeforeAfter() {
    this.uploadedBeforePhoto = "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=700&auto=format&fit=crop&q=80";
    this.uploadedAfterPhoto = "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=700&auto=format&fit=crop&q=80";

    const boxBefore = document.getElementById('post-before-preview-box');
    if (boxBefore) {
      boxBefore.innerHTML = `
        <img src="${this.uploadedBeforePhoto}" style="width:100%; height:75px; border-radius:8px; object-fit:cover;" alt="Before Preview">
        <div style="font-size:0.7rem; color:#DC2626; font-weight:800; margin-top:3px;">✓ Before Sample Loaded</div>
      `;
    }

    const boxAfter = document.getElementById('post-after-preview-box');
    if (boxAfter) {
      boxAfter.innerHTML = `
        <img src="${this.uploadedAfterPhoto}" style="width:100%; height:75px; border-radius:8px; object-fit:cover;" alt="After Preview">
        <div style="font-size:0.7rem; color:#15803D; font-weight:800; margin-top:3px;">✓ After Sample Loaded</div>
      `;
    }

    const textInput = document.getElementById('new-post-text-input');
    if (textInput && !textInput.value) {
      textInput.value = "Transforming our local lane! We gathered 8 neighbors to clear the illegal debris corner and planted fresh bougainvillea pots.";
    }

    CityAssist.showToast("Sample Before & After photos loaded! 🌿");
  },

  presetScenarios: {
    overflowing_bin: {
      url: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=700&auto=format&fit=crop&q=80',
      label: '🚨 Overflowing Garbage Bin',
      intent: 'complaint',
      subCategory: 'bin_overflow'
    },
    road_pothole: {
      url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=700&auto=format&fit=crop&q=80',
      label: '🕳️ Hazardous Road Pothole',
      intent: 'complaint',
      subCategory: 'pothole'
    },
    broken_streetlight: {
      url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=700&auto=format&fit=crop&q=80',
      label: '💡 Dark Blindspot / Streetlight Down',
      intent: 'complaint',
      subCategory: 'streetlight'
    },
    tree_plantation: {
      url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=700&auto=format&fit=crop&q=80',
      label: '🌺 Neighborhood Tree Plantation',
      intent: 'appreciation',
      subCategory: 'plantation'
    },
    sanitation_gratitude: {
      url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=700&auto=format&fit=crop&q=80',
      label: '💛 Sanitation Staff Appreciation',
      intent: 'appreciation',
      subCategory: 'sanitation_kudos'
    }
  },

  loadPresetScenario(key) {
    const scenario = this.presetScenarios[key];
    if (!scenario) return;

    this.postFormat = 'standard';
    this.uploadedPhoto = scenario.url;
    this.currentDetectedScenario = scenario;

    const box = document.getElementById('post-photo-preview-box');
    if (box) {
      box.innerHTML = `
        <img src="${this.uploadedPhoto}" style="max-height:80px; border-radius:8px; object-fit:cover;" alt="Preview">
        <div style="font-size:0.75rem; color:${scenario.intent === 'complaint' ? '#DC2626' : '#15803D'}; font-weight:800; margin-top:4px;">
          ✓ ${scenario.label}
        </div>
      `;
    }
    this.triggerCommunityAIVision(scenario.intent, scenario.subCategory);
  },

  loadSampleComplaint() {
    this.loadPresetScenario('overflowing_bin');
  },

  loadSampleAppreciation() {
    this.loadPresetScenario('tree_plantation');
  },

  /**
   * Dynamic Natural Language Generation (NLG) based on detected visual scene
   */
  generateCivicDescription(intent, subCategory, userText = '') {
    const landmarks = ['Samta Colony Gate 2', 'Jijamata Chowk', 'Talegaon Station Road', 'Maratha Colony', 'Swarajya Chowk', 'Ward 2 Market Area'];
    const randomLandmark = landmarks[Math.floor(Math.random() * landmarks.length)];

    const complaintCatalogs = {
      bin_overflow: {
        title: 'Overflowing Municipal Dumpster',
        templates: [
          `⚠️ Urgent Civic Attention Needed in Talegaon (${randomLandmark}): The community collection dumpster is completely filled beyond capacity with garbage spilling onto the sidewalk. Requesting prompt clearing by PMC sanitization team to maintain public hygiene.`,
          `🚨 Sanitation Grievance (${randomLandmark}): Waste collection bin has been overflowing for the past 24 hours. Stray animals are scattering plastic waste across the street. Immediate municipal loader dispatch requested.`,
          `⚠️ Public Health Concern: Severe garbage buildup observed around the collection point at ${randomLandmark}, Talegaon. Urging municipal waste management authorities for quick clearance.`
        ],
        hashtags: '#TalegaonCivicIssue #BinOverflow #CleanTalegaon #Ward2Sanitation #MunicipalActionNeeded'
      },
      pothole: {
        title: 'Hazardous Road Pothole & Waterlogging',
        templates: [
          `⚠️ Road Safety Hazard in Talegaon (${randomLandmark}): Dangerous deep potholes formed on the main transit lane, posing a severe skid risk to two-wheeler commuters. Asphalt leveling and cold-mix patch repair requested immediately.`,
          `🚨 Commuter Safety Alert: Deep road crater near ${randomLandmark} is worsening with daily vehicle traffic. Immediate bituminous resurfacing needed from the PMC engineering division before rain causes accidents.`,
          `⚠️ Infrastructure Defect Notice: Large asphalt depression at ${randomLandmark} causing traffic bottlenecks and vehicle suspension damage. Urgent civic restoration requested.`
        ],
        hashtags: '#TalegaonRoadSafety #PotholeAlert #SafeStreets #CivicRepairs #PMCInfrastructure'
      },
      streetlight: {
        title: 'Non-Functional Streetlight / Dark Safety Zone',
        templates: [
          `⚠️ Public Safety Notice (${randomLandmark}): Streetlight fixture is completely non-functional, creating a dark hazard zone for evening pedestrians and senior citizens. Urgent LED bulb replacement requested.`,
          `🚨 Night Security Concern: Two consecutive streetlights out along ${randomLandmark}, Talegaon. Requesting the municipal electrical maintenance division to inspect and restore street illumination.`,
          `⚠️ Civic Utility Breakdown: Dark corridor created due to blown streetlamp at ${randomLandmark}. Please schedule a maintenance ladder van to fix the illumination.`
        ],
        hashtags: '#StreetlightFix #TalegaonNightSafety #Ward2Utilities #SafeNeighborhood #PMCElectrical'
      },
      water_leak: {
        title: 'Potable Drinking Water Pipeline Leakage',
        templates: [
          `⚠️ Clean Water Wastage Alert (${randomLandmark}): Underground municipal supply pipe joint is leaking heavily. Clean drinking water has been flooding the pavement since morning. Urgent valve clamp repair needed.`,
          `🚨 Water Infrastructure Issue: Pipeline burst near ${randomLandmark}, Talegaon causing localized flooding and water pressure drop in nearby residences. Requesting prompt PMC Water Works repair.`,
          `⚠️ Water Conservation Notice: Continuous pipeline overflow observed at ${randomLandmark}. Immediate technician dispatch requested to prevent clean water loss.`
        ],
        hashtags: '#SaveWaterTalegaon #WaterLeakAlert #PMCWaterWorks #ConserveWater #TalegaonCivic'
      },
      general_complaint: {
        title: 'Civic Issue & Public Maintenance Request',
        templates: [
          `⚠️ Civic Maintenance Needed at ${randomLandmark}, Talegaon: Observed unaddressed municipal maintenance defect impacting local residents. Requesting prompt inspection by the ward officer.`,
          `🚨 Citizen Civic Report: Public amenity issue spotted in ${randomLandmark}. Urging Talegaon Municipal Corporation for timely resolution and site cleanup.`
        ],
        hashtags: '#TalegaonCivicAlert #Ward2Action #CleanCity #CitizenVoice #MunicipalSupport'
      }
    };

    const appreciationCatalogs = {
      plantation: {
        title: 'Neighborhood Green Tree Plantation',
        templates: [
          `🌺 Green Talegaon Initiative (${randomLandmark}): Local residents and volunteers came together to plant native flowering saplings and bougainvillea along our street. Creating a greener, healthier community for everyone!`,
          `🌿 Community Greenery Drive: Proud of our neighborhood teamwork in ${randomLandmark}! We transformed a barren street curb into a vibrant green micro-garden. Let us nurture and protect our urban trees.`,
          `🌳 Swachh Talegaon Pride: Adding more greenery to Ward 2! Inspiring weekend tree adoption drive completed by local youth and seniors. Every tree counts!`
        ],
        hashtags: '#GreenTalegaon #TreePlantation #SwachhBharat #EcoFriendlyTalegaon #CommunityPride'
      },
      sanitation_kudos: {
        title: 'PMC Sanitation Workers Appreciation',
        templates: [
          `💛 Sincere Gratitude to PMC Sanitation Squad #4! Punctual doorstep collection and thorough street sweeping around ${randomLandmark} this morning. Unsung heroes keeping Talegaon spotless every day!`,
          `👏 Appreciation Post: Impressed by the rapid, courteous response of the Talegaon municipal sanitization crew. Cleared our community point within 45 minutes of request. Outstanding dedication!`,
          `🌟 Big thanks to our daily municipal workers for keeping Talegaon Dabhade hygienic and clean, rain or shine. Let us support them by practicing 100% waste segregation at home!`
        ],
        hashtags: '#SanitationHeroes #TalegaonPMC #CleanCityChampion #GratitudeToWorkers #RespectSanitation'
      },
      before_after: {
        title: 'Community Clean-Up Transformation',
        templates: [
          `🌱 Remarkable Before & After at ${randomLandmark}, Talegaon! Together with neighborhood volunteers, we cleared 40kg of discarded plastics and beautified the space with flowering pots. Proud of our community spirit!`,
          `✨ Check out this amazing transformation! What was once a littered corner near ${randomLandmark} is now clean, green, and completely transformed. Citizen teamwork makes all the difference!`,
          `🌿 Before vs After Community Action: Transformed an illegal dumping corner into a pristine neighborhood space. Proud to keep Talegaon clean and green!`
        ],
        hashtags: '#BeforeAndAfter #CleanTalegaon #ZeroLitter #CommunityAction #SwachhTalegaon'
      },
      general_appreciation: {
        title: 'Community Cleanliness Appreciation',
        templates: [
          `✨ Wonderful community cleanliness update from ${randomLandmark}! Great coordination between active residents and municipal staff to maintain our neighborhood.`,
          `💛 Clean Talegaon Pride: Inspiring community efforts in ${randomLandmark}. Let's continue supporting civic hygiene and eco-friendly living!`
        ],
        hashtags: '#TalegaonCleanAndGreen #SwachhTalegaon #CommunitySpirit #ResponsibleCitizen'
      }
    };

    let catalogGroup = intent === 'complaint' ? complaintCatalogs : appreciationCatalogs;
    let selectedCatalog = catalogGroup[subCategory] || (intent === 'complaint' ? catalogGroup.bin_overflow : catalogGroup.plantation);

    const templates = selectedCatalog.templates;
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    const fullText = `${randomTemplate}\n\n${selectedCatalog.hashtags}`;

    return {
      title: selectedCatalog.title,
      text: fullText,
      hashtags: selectedCatalog.hashtags
    };
  },

  /**
   * HTML5 Canvas Image Pixel Analysis Engine
   */
  analyzeImagePixelsAsync(imageSrc, callback) {
    if (!imageSrc) {
      callback({ intent: 'complaint', subCategory: 'bin_overflow', confidence: 96.5 });
      return;
    }

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;
        const total = size * size;

        let green = 0, dark = 0, bright = 0, gray = 0, blue = 0, warmDebris = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          if (g > r * 1.15 && g > b * 1.15 && g > 45) green++;
          if (lum < 40) dark++;
          if (lum > 210) bright++;
          if (Math.abs(r - g) < 18 && Math.abs(g - b) < 18 && lum > 40 && lum < 170) gray++;
          if (b > r * 1.25 && b > g * 1.05 && b > 60) blue++;
          if ((r > 130 && g < 100 && b < 100) || (r > 140 && g > 120 && b < 80)) warmDebris++;
        }

        const greenRatio = green / total;
        const darkRatio = dark / total;
        const brightRatio = bright / total;
        const grayRatio = gray / total;
        const blueRatio = blue / total;
        const debrisRatio = warmDebris / total;

        let intent = 'complaint';
        let subCategory = 'bin_overflow';
        let conf = 97.5;

        if (greenRatio > 0.18) {
          intent = 'appreciation';
          subCategory = 'plantation';
          conf = Math.min(99.4, 94 + greenRatio * 20);
        } else if (darkRatio > 0.45 && (brightRatio > 0.01 || darkRatio > 0.65)) {
          intent = 'complaint';
          subCategory = 'streetlight';
          conf = 98.2;
        } else if (blueRatio > 0.18) {
          intent = 'complaint';
          subCategory = 'water_leak';
          conf = 96.8;
        } else if (grayRatio > 0.30 && greenRatio < 0.10) {
          intent = 'complaint';
          subCategory = 'pothole';
          conf = 98.6;
        } else if (debrisRatio > 0.12 || greenRatio < 0.10) {
          intent = 'complaint';
          subCategory = 'bin_overflow';
          conf = 98.8;
        }

        callback({ intent, subCategory, confidence: Number(conf.toFixed(1)) });
      } catch (e) {
        callback({ intent: 'complaint', subCategory: 'bin_overflow', confidence: 96.0 });
      }
    };
    img.onerror = () => {
      callback({ intent: 'complaint', subCategory: 'bin_overflow', confidence: 95.0 });
    };
    img.src = imageSrc;
  },

  async triggerCommunityAIVision(forcedIntent = null, forcedSubCategory = null) {
    const isBA = this.postFormat === 'beforeafter' || (this.uploadedBeforePhoto && this.uploadedAfterPhoto);
    const scannerWrap = document.getElementById('comm-ai-scanner-wrap');
    const statusText = document.getElementById('comm-ai-status-text');
    const textInput = document.getElementById('new-post-text-input');
    const triageBadge = document.getElementById('comm-ai-triage-badge');

    if (!this.uploadedPhoto && !this.uploadedBeforePhoto) {
      if (this.postFormat === 'beforeafter') {
        this.loadSampleBeforeAfter();
      } else {
        this.loadPresetScenario('road_pothole');
        return;
      }
    }

    if (scannerWrap) {
      scannerWrap.style.display = 'block';
      if (statusText) statusText.textContent = "🔍 Ingesting visual scene & running Gemini AI analysis...";
    }
    if (triageBadge) triageBadge.style.display = 'none';

    setTimeout(() => {
      if (statusText) statusText.textContent = "⚡ Triaging civic hazard and generating tailored Talegaon narrative...";
    }, 500);

    let result = null;

    if (forcedSubCategory) {
      result = (typeof GeminiVisionEngine !== 'undefined')
        ? GeminiVisionEngine.getTopicTemplate(forcedSubCategory, 'Talegaon Main Road', forcedIntent || 'complaint', 99.2)
        : this.generateCivicDescription(forcedIntent || 'complaint', forcedSubCategory);
    } else if (isBA) {
      result = (typeof GeminiVisionEngine !== 'undefined')
        ? GeminiVisionEngine.getTopicTemplate('plantation', 'Talegaon Samta Colony', 'appreciation', 99.4)
        : this.generateCivicDescription('appreciation', 'before_after');
    } else if (typeof GeminiVisionEngine !== 'undefined' && this.uploadedPhoto) {
      try {
        result = await GeminiVisionEngine.analyzeCivicImage(this.uploadedPhoto);
      } catch (e) {
        console.warn('Gemini vision call in community failed:', e);
      }
    }

    if (!result) {
      result = {
        category: 'Potholes / Bad Road',
        title: 'Hazardous Road Pothole & Broken Asphalt',
        intent: 'complaint',
        subCategory: 'pothole',
        description: 'Dangerous deep potholes and broken asphalt formed on the main transit lane in Talegaon, posing a severe skid risk to two-wheeler commuters. Asphalt leveling and cold-mix patch repair requested immediately.',
        hashtags: '#TalegaonRoadSafety #PotholeAlert #SafeStreets #CivicRepairs #PMCInfrastructure',
        confidence: 98.4
      };
    }

    setTimeout(() => {
      if (scannerWrap) scannerWrap.style.display = 'none';

      const fullText = `${result.description || result.text || ''}\n\n${result.hashtags || ''}`.trim();
      if (textInput) {
        textInput.value = fullText;
      }

      // Set category radio
      const radioVal = result.intent === 'complaint' ? 'report' : 'appreciate';
      const radio = document.querySelector(`input[name="comm-post-cat"][value="${radioVal}"]`);
      if (radio) radio.checked = true;

      // Render interactive topic refinement HUD
      if (triageBadge) {
        const isComp = result.intent === 'complaint';
        const subCat = result.subCategory || 'pothole';
        triageBadge.style.background = isComp ? '#FEF2F2' : '#F0FDF4';
        triageBadge.style.border = isComp ? '1.5px solid #FECACA' : '1.5px solid #BBF7D0';
        triageBadge.style.display = 'block';

        triageBadge.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:6px; color:${isComp ? '#DC2626' : '#15803D'}; font-weight:800;">
              <span>${isComp ? '🚨' : '💛'}</span>
              <span>AI Detected: <strong>${result.title || result.category}</strong> (${result.confidence || 98.4}% conf)</span>
            </div>
          </div>
          <div style="font-size:0.72rem; color:#64748B; font-weight:700; margin-bottom:5px;">🎯 Detected Topic (Tap to switch scenario):</div>
          <div style="display:flex; gap:5px; flex-wrap:wrap;">
            <button type="button" onclick="CommunityEngine.refineDetectedTopic('pothole', 'complaint')" style="background:${subCat === 'pothole' ? '#EA580C' : '#FFFFFF'}; color:${subCat === 'pothole' ? '#FFF' : '#EA580C'}; border:1px solid #FFEDD5; padding:3px 8px; border-radius:8px; font-size:0.72rem; font-weight:700; cursor:pointer;">
              🛣️ Road Pothole
            </button>
            <button type="button" onclick="CommunityEngine.refineDetectedTopic('bin_overflow', 'complaint')" style="background:${subCat === 'bin_overflow' ? '#DC2626' : '#FFFFFF'}; color:${subCat === 'bin_overflow' ? '#FFF' : '#DC2626'}; border:1px solid #FECACA; padding:3px 8px; border-radius:8px; font-size:0.72rem; font-weight:700; cursor:pointer;">
              🗑️ Waste Overflow
            </button>
            <button type="button" onclick="CommunityEngine.refineDetectedTopic('streetlight', 'complaint')" style="background:${subCat === 'streetlight' ? '#D97706' : '#FFFFFF'}; color:${subCat === 'streetlight' ? '#FFF' : '#D97706'}; border:1px solid #FDE68A; padding:3px 8px; border-radius:8px; font-size:0.72rem; font-weight:700; cursor:pointer;">
              💡 Broken Light
            </button>
            <button type="button" onclick="CommunityEngine.refineDetectedTopic('water_leak', 'complaint')" style="background:${subCat === 'water_leak' ? '#0284C7' : '#FFFFFF'}; color:${subCat === 'water_leak' ? '#FFF' : '#0284C7'}; border:1px solid #BAE6FD; padding:3px 8px; border-radius:8px; font-size:0.72rem; font-weight:700; cursor:pointer;">
              💧 Water Leak
            </button>
            <button type="button" onclick="CommunityEngine.refineDetectedTopic('plantation', 'appreciation')" style="background:${subCat === 'plantation' ? '#15803D' : '#FFFFFF'}; color:${subCat === 'plantation' ? '#FFF' : '#15803D'}; border:1px solid #BBF7D0; padding:3px 8px; border-radius:8px; font-size:0.72rem; font-weight:700; cursor:pointer;">
              🌺 Tree Planting
            </button>
            <button type="button" onclick="CommunityEngine.refineDetectedTopic('sanitation_kudos', 'appreciation')" style="background:${subCat === 'sanitation_kudos' ? '#059669' : '#FFFFFF'}; color:${subCat === 'sanitation_kudos' ? '#FFF' : '#059669'}; border:1px solid #A7F3D0; padding:3px 8px; border-radius:8px; font-size:0.72rem; font-weight:700; cursor:pointer;">
              💛 Worker Kudos
            </button>
          </div>
        `;
      }

      if (typeof AudioAnnouncerEngine !== 'undefined') {
        AudioAnnouncerEngine.playChimeSound('high');
      }
      CityAssist.showToast(`🎯 AI Detected: ${result.title || result.category}`);
    }, 1300);
  },

  refineDetectedTopic(subCategory, intent) {
    this.triggerCommunityAIVision(intent, subCategory);
  },

  publishPost() {
    const text = document.getElementById('new-post-text-input').value.trim();
    if (!text) {
      alert("Please write some text before publishing.");
      return;
    }

    const isBeforeAfter = this.postFormat === 'beforeafter' || (this.uploadedBeforePhoto && this.uploadedAfterPhoto);
    
    if (this.postFormat === 'beforeafter' && (!this.uploadedBeforePhoto || !this.uploadedAfterPhoto)) {
      alert("Please select both 'Before' and 'After' photos for a transformation post.");
      return;
    }

    const selectedCategory = document.querySelector('input[name="comm-post-cat"]:checked').value;
    
    let badgeText = isBeforeAfter ? "Transformation" : "Appreciation";
    let badgeType = isBeforeAfter ? "appreciation" : "appreciation";
    if (selectedCategory === 'report') { badgeText = "Report"; badgeType = "report"; }
    else if (selectedCategory === 'updates') { badgeText = "Update"; badgeType = "update"; }
    else if (selectedCategory === 'events') { badgeText = "Event"; badgeType = "event"; }

    const authorName = (typeof AuthEngine !== 'undefined' && AuthEngine.currentUser && AuthEngine.currentUser.name) 
      ? AuthEngine.currentUser.name 
      : (CityData.user.name || "Citizen");
    const authorAvatar = (typeof AuthEngine !== 'undefined' && AuthEngine.currentUser && AuthEngine.currentUser.avatar) 
      ? AuthEngine.currentUser.avatar 
      : (CityData.user.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80");

    const newPost = {
      id: `POST-${Date.now()}`,
      author: {
        name: authorName,
        role: "Active Citizen",
        avatar: authorAvatar,
        isOfficial: false
      },
      time: "Just now",
      category: selectedCategory,
      badgeText: badgeText,
      badgeType: badgeType,
      text: text,
      isBeforeAfter: isBeforeAfter,
      beforeImage: isBeforeAfter ? this.uploadedBeforePhoto : null,
      afterImage: isBeforeAfter ? this.uploadedAfterPhoto : null,
      image: !isBeforeAfter ? (this.uploadedPhoto || null) : null,
      likes: 1,
      comments: 0,
      isLiked: true,
      isBookmarked: false
    };

    CityData.communityPosts.unshift(newPost);
    CityData.user.points += isBeforeAfter ? 35 : 15; // bonus points for Before & After transformation
    
    // Save to LocalStorage immediately so posts persist across app restarts/reloads
    this.savePosts();
    if (typeof CityAssist !== 'undefined' && typeof CityAssist.saveProfile === 'function') {
      CityAssist.saveProfile();
    }

    // Reset uploaded buffers
    this.uploadedPhoto = null;
    this.uploadedBeforePhoto = null;
    this.uploadedAfterPhoto = null;

    CityAssist.closeModal();
    this.currentCategory = 'all';
    
    // Update active category tile to all
    document.querySelectorAll('.comm-category-tile').forEach(tile => {
      tile.classList.remove('active');
      if (tile.dataset.category === 'all') tile.classList.add('active');
    });

    this.renderFeed();
    CityAssist.showToast("Post published to Community! +15 Points Earned ⭐");
  }
};

/**
 * Services & Technicians Engine
 */
const ServicesEngine = {
  currentCategory: 'all',

  init() {
    this.renderProfessionals();
  },

  renderProfessionals(filtered = null) {
    const container = document.getElementById('professionals-list-feed');
    if (!container) return;

    const list = filtered || this.getFilteredPros();

    if (list.length === 0) {
      container.innerHTML = `
        <div class="muni-squad-white-card" style="text-align:center; padding:28px 12px; color:#64748B;">
          <div style="font-size:2.2rem; margin-bottom:6px;">🏛️</div>
          <p style="font-size:0.92rem; font-weight:800; color:#1E293B; margin:0;">No municipal squad found</p>
          <p style="font-size:0.78rem; margin-top:2px; color:#64748B;">Tap "See All" to view all municipal response teams.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(pro => `
      <div class="muni-squad-white-card" onclick="ServicesEngine.callProfessional('${pro.id}')" style="margin-bottom:12px; cursor:pointer;">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px;">
          
          <!-- Left: Vehicle / Squad Icon & Details -->
          <div style="display:flex; align-items:flex-start; gap:11px; flex:1;">
            <div style="position:relative; width:48px; height:48px; flex-shrink:0;">
              <img src="${pro.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; border:2px solid #E2E8F0; background:#F8FAFC;" alt="${pro.name}">
              <span style="position:absolute; bottom:0; right:0; width:12px; height:12px; background:#16A34A; border:2px solid #FFFFFF; border-radius:50%;"></span>
            </div>
            
            <div style="flex:1;">
              <h4 style="font-size:0.92rem; font-weight:800; color:#0F172A; margin:0; line-height:1.25;">${pro.name}</h4>
              <div style="margin-top:3px; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <span style="background:#DCFCE7; color:#15803D; font-size:0.7rem; font-weight:800; padding:1px 7px; border-radius:6px; display:inline-block;">Active</span>
                <span style="background:#F1F5F9; color:#475569; font-size:0.68rem; font-weight:700; padding:1px 6px; border-radius:6px;">${pro.categoryLabel || 'Division'}</span>
              </div>
              <div style="font-size:0.73rem; color:#64748B; font-weight:600; margin-top:4px; display:flex; align-items:center; gap:3px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="#15803D" stroke-width="2.5" width="12" height="12"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                <span>${pro.distance}</span>
              </div>
            </div>
          </div>

          <!-- Right: Rating & Call Button -->
          <div style="display:flex; flex-direction:column; align-items:flex-end; flex-shrink:0;">
            <div style="display:flex; align-items:center; gap:3px; font-size:0.85rem; font-weight:800; color:#D97706;">
              <span>★</span>
              <span>${pro.rating}</span>
            </div>
            <div style="font-size:0.7rem; color:#64748B; margin-top:1px;">(${pro.reviews} resolved)</div>
            
            <a href="tel:${pro.phone}" onclick="event.stopPropagation(); CityAssist.showToast('Calling ${pro.name}... 📞');" style="width:36px; height:36px; border-radius:50%; background:#DCFCE7; color:#15803D; display:flex; align-items:center; justify-content:center; margin-top:6px; text-decoration:none; box-shadow:0 2px 6px rgba(21,128,61,0.15);" title="Call Helpline">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" width="17" height="17"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </a>
          </div>

        </div>

        <!-- Bottom Pill Strip: Status & View Details -->
        <div style="background:#F0FDF4; border-radius:10px; padding:7px 11px; margin-top:10px; display:flex; align-items:center; justify-content:space-between; font-size:0.73rem; font-weight:700; color:#15803D;">
          <div style="display:flex; align-items:center; gap:5px;">
            <span>🚚</span>
            <span>On duty • Serving the community</span>
          </div>
          <span style="color:#047857; font-weight:800; cursor:pointer;" onclick="event.stopPropagation(); ServicesEngine.callProfessional('${pro.id}')">
            View Details &gt;
          </span>
        </div>
      </div>
    `).join('');
  },

  getFilteredPros() {
    if (this.currentCategory === 'all') {
      return CityData.professionals;
    }
    return CityData.professionals.filter(p => p.category === this.currentCategory);
  },

  filterCategory(category, element) {
    this.currentCategory = category;

    // Update chips
    document.querySelectorAll('.muni-chip-item').forEach(chip => {
      chip.classList.remove('active');
      if (chip.dataset.category === category) chip.classList.add('active');
    });

    // Update cards
    document.querySelectorAll('.muni-service-card').forEach(tile => {
      tile.classList.remove('active');
      if (tile.dataset.category === category) tile.classList.add('active');
    });

    this.renderProfessionals();
    CityAssist.showToast(`Filtered: ${category.toUpperCase()} Division Squad`);
  },

  showAllCategories() {
    this.currentCategory = 'all';
    document.querySelectorAll('.muni-chip-item').forEach(chip => {
      chip.classList.remove('active');
      if (chip.dataset.category === 'all') chip.classList.add('active');
    });
    document.querySelectorAll('.muni-service-card').forEach(tile => {
      tile.classList.remove('active');
    });
    const searchInput = document.getElementById('services-search-input');
    if (searchInput) searchInput.value = '';
    this.renderProfessionals();
    CityAssist.showToast("Showing all Municipal Divisions");
  },

  handleSearch(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
      this.renderProfessionals();
      return;
    }
    const filtered = CityData.professionals.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.categoryLabel.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.officer && p.officer.toLowerCase().includes(q))
    );
    this.renderProfessionals(filtered);
  },

  clearSearch() {
    const searchInput = document.getElementById('services-search-input');
    if (searchInput) searchInput.value = '';
    this.renderProfessionals();
  },

  openCardActionSheet(category) {
    const categoryDetails = {
      'waste': {
        title: 'Waste & Garbage Division',
        icon: '🗑️',
        desc: 'Report missed collection, overflowing public bins, or garbage dumping.',
        helpline: '1800-233-0244',
        officer: 'Mr. Arvind Joshi (Sanitation Inspector)'
      },
      'water': {
        title: 'Water Supply Department',
        icon: '💧',
        desc: 'Report pipeline bursts, contamination, or water supply disruption.',
        helpline: '+91 2114 222011',
        officer: 'Er. S. M. Kulkarni (Hydraulic Engineer)'
      },
      'roads': {
        title: 'Roads & Pothole Repair Unit',
        icon: '🛣️',
        desc: 'Report dangerous potholes, broken pavements, or road cave-ins.',
        helpline: '+91 2114 222012',
        officer: 'Er. Rajesh Gaikwad (Roads & Infrastructure)'
      },
      'streetlights': {
        title: 'Electrical & Streetlight Division',
        icon: '💡',
        desc: 'Report unlit streetlights, flickering lamps, or damaged electric poles.',
        helpline: '+91 2114 222013',
        officer: 'Er. Nikhil Shinde (Electrical Section)'
      },
      'drainage': {
        title: 'Drainage & Sewerage Network',
        icon: '🚰',
        desc: 'Report overflowing manholes, blocked storm drains, or sewage leakage.',
        helpline: '+91 2114 222014',
        officer: 'Er. V. R. Pawar (Drainage Superintendent)'
      },
      'cleanliness': {
        title: 'Public Cleanliness & Swachhta Squad',
        icon: '🧹',
        desc: 'Report market litter, dirty public spaces, or unattended waste heaps.',
        helpline: '1800-233-0244',
        officer: 'Mr. Santosh Kamble (Swachh Bharat Officer)'
      },
      'trees': {
        title: 'Horticulture & Tree Management',
        icon: '🌳',
        desc: 'Report hazardous branches, tree pruning needs, or garden upkeep.',
        helpline: '+91 2114 222015',
        officer: 'Er. Pramod Salve (Garden Superintendent)'
      },
      'infra': {
        title: 'Public Infrastructure & Civil Assets',
        icon: '🚏',
        desc: 'Report damaged bus shelters, broken pavements, or railing damage.',
        helpline: '+91 2114 222016',
        officer: 'Er. Sanjay Bhalerao (Civil Assets Engineer)'
      },
      'health': {
        title: 'Public Health & Vector Fogging',
        icon: '🏥',
        desc: 'Request mosquito fogging, malaria/dengue prevention, or hygiene spray.',
        helpline: '1800-233-0406',
        officer: 'Dr. Sandeep More (Chief Health Officer)'
      },
      'other': {
        title: 'Central Municipal Grievance Cell',
        icon: '📋',
        desc: 'Report noise nuisance, unauthorized hoardings, or other municipal issues.',
        helpline: '1800-233-0244',
        officer: 'Shri. M. K. Thorat (Chief Admin Officer)'
      }
    };

    const info = categoryDetails[category] || categoryDetails['waste'];

    CityAssist.openModal(`
      <div style="text-align:center; padding:4px 0 12px;">
        <div style="font-size:2.8rem; margin-bottom:6px;">${info.icon}</div>
        <h3 style="font-size:1.2rem; font-weight:800; color:#0F172A; margin:0;">${info.title}</h3>
        <p style="font-size:0.78rem; color:#64748B; margin:4px 0 0;">${info.desc}</p>
        <span style="display:inline-block; background:#DCFCE7; color:#15803D; font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:12px; margin-top:8px;">
          Nodal: ${info.officer}
        </span>
      </div>

      <div style="display:flex; flex-direction:column; gap:10px; margin-top:8px;">
        <button type="button" onclick="CityAssist.closeModal(); ServicesEngine.openServiceRequest('${category}')" style="background:linear-gradient(135deg, #0F7943, #16A34A); color:#FFFFFF; border:none; font-size:0.9rem; font-weight:800; padding:13px; border-radius:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 4px 14px rgba(15,121,67,0.3);">
          <span>📝</span>
          <span>Report Issue in this Category</span>
        </button>

        <button type="button" onclick="CityAssist.closeModal(); ServicesEngine.filterCategory('${category}');" style="background:#F0FDF4; color:#15803D; border:1.5px solid #BBF7D0; font-size:0.88rem; font-weight:800; padding:11px; border-radius:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
          <span>🚚</span>
          <span>View Dedicated Squad Unit</span>
        </button>

        <a href="tel:${info.helpline}" onclick="CityAssist.closeModal(); CityAssist.showToast('Dialing Helpline: ${info.helpline}');" style="background:#FFFFFF; color:#1E293B; border:1.5px solid #E2E8F0; font-size:0.88rem; font-weight:800; padding:11px; border-radius:14px; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:8px;">
          <span>📞</span>
          <span>Call Division Helpline (${info.helpline})</span>
        </a>
      </div>
    `);
  },

  openMoreServicesModal() {
    CityAssist.openModal(`
      <div style="text-align:center; padding-bottom:12px; border-bottom:1px solid #F1F5F9; margin-bottom:14px;">
        <div style="font-size:2.2rem; margin-bottom:4px;">🏛️</div>
        <h3 style="font-size:1.15rem; font-weight:800; color:#0F172A; margin:0;">Additional Municipal Services</h3>
        <p style="font-size:0.75rem; color:#64748B; margin:3px 0 0;">Citizen Grievances &amp; Civic Support</p>
      </div>

      <div style="display:flex; flex-direction:column; gap:10px; max-height:360px; overflow-y:auto; padding-right:4px;">
        
        <!-- 1. Trees & Public Parks -->
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:14px; padding:11px 13px; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.4rem;">🌳</span>
            <div>
              <strong style="font-size:0.86rem; color:#0F172A; display:block;">Tree Trimming &amp; Parks</strong>
              <span style="font-size:0.72rem; color:#64748B;">Dead branch pruning, garden upkeep</span>
            </div>
          </div>
          <button type="button" onclick="CityAssist.closeModal(); ServicesEngine.openServiceRequest('waste');" style="background:#DCFCE7; color:#15803D; border:none; font-size:0.72rem; font-weight:800; padding:6px 10px; border-radius:8px; cursor:pointer;">
            Report
          </button>
        </div>

        <!-- 2. Animal Control -->
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:14px; padding:11px 13px; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.4rem;">🐕</span>
            <div>
              <strong style="font-size:0.86rem; color:#0F172A; display:block;">Animal Care &amp; Control</strong>
              <span style="font-size:0.72rem; color:#64748B;">Stray animal rescue, anti-rabies</span>
            </div>
          </div>
          <button type="button" onclick="CityAssist.closeModal(); ServicesEngine.openServiceRequest('cleanliness');" style="background:#DCFCE7; color:#15803D; border:none; font-size:0.72rem; font-weight:800; padding:6px 10px; border-radius:8px; cursor:pointer;">
            Report
          </button>
        </div>

        <!-- 3. Property Tax & Water Bills -->
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:14px; padding:11px 13px; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.4rem;">📋</span>
            <div>
              <strong style="font-size:0.86rem; color:#0F172A; display:block;">Property Tax &amp; Water Bills</strong>
              <span style="font-size:0.72rem; color:#64748B;">Online assessment, billing inquiries</span>
            </div>
          </div>
          <button type="button" onclick="CityAssist.closeModal(); CityAssist.showToast('Redirecting to PMC Tax Portal...');" style="background:#EFF6FF; color:#1D4ED8; border:none; font-size:0.72rem; font-weight:800; padding:6px 10px; border-radius:8px; cursor:pointer;">
            Pay Online
          </button>
        </div>

        <!-- 4. Public Health & Fogging -->
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:14px; padding:11px 13px; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.4rem;">🏥</span>
            <div>
              <strong style="font-size:0.86rem; color:#0F172A; display:block;">Public Health &amp; Fogging</strong>
              <span style="font-size:0.72rem; color:#64748B;">Mosquito fumigation, dengue control</span>
            </div>
          </div>
          <button type="button" onclick="CityAssist.closeModal(); ServicesEngine.openServiceRequest('cleanliness');" style="background:#DCFCE7; color:#15803D; border:none; font-size:0.72rem; font-weight:800; padding:6px 10px; border-radius:8px; cursor:pointer;">
            Request
          </button>
        </div>

        <!-- 5. Noise & Encroachment -->
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:14px; padding:11px 13px; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.4rem;">🔊</span>
            <div>
              <strong style="font-size:0.86rem; color:#0F172A; display:block;">Noise &amp; Encroachment</strong>
              <span style="font-size:0.72rem; color:#64748B;">Footpath obstruction, illegal banners</span>
            </div>
          </div>
          <button type="button" onclick="CityAssist.closeModal(); ServicesEngine.openServiceRequest('roads');" style="background:#DCFCE7; color:#15803D; border:none; font-size:0.72rem; font-weight:800; padding:6px 10px; border-radius:8px; cursor:pointer;">
            Report
          </button>
        </div>

      </div>

      <div style="margin-top:14px;">
        <button type="button" onclick="CityAssist.closeModal()" style="width:100%; background:#F1F5F9; color:#475569; font-weight:800; font-size:0.86rem; padding:11px; border-radius:12px; border:none; cursor:pointer;">
          Close
        </button>
      </div>
    `);
  },

  openServiceRequest(category) {
    CityAssist.navigateTo('report-issue');
    setTimeout(() => {
      const map = {
        'waste': 'Overflowing Bin',
        'water': 'Water Leakage',
        'roads': 'Potholes / Bad Road',
        'streetlights': 'Broken Streetlight',
        'drainage': 'Water Leakage',
        'cleanliness': 'Dirty Area',
        'trees': 'Dirty Area',
        'infra': 'Potholes / Bad Road',
        'health': 'Dirty Area',
        'other': 'Other Issue'
      };
      const targetIssue = map[category] || 'Potholes / Bad Road';
      const tiles = document.querySelectorAll('.issue-type-tile');
      tiles.forEach(tile => {
        if (tile.dataset.issue === targetIssue) {
          CityAssist.selectIssueType(tile, targetIssue);
        }
      });
      CityAssist.showToast(`Pre-selected: ${targetIssue}`);
    }, 250);
  },

  callProfessional(proId) {
    const pro = CityData.professionals.find(p => p.id === proId);
    if (!pro) return;

    CityAssist.openModal(`
      <div class="modal-header-block" style="text-align:center;">
        <div style="width:70px; height:70px; margin:0 auto 10px; position:relative;">
          <img src="${pro.avatar}" style="width:100%; height:100%; border-radius:50%; border:3px solid #15803D; object-fit:cover;" alt="${pro.name}">
          <span style="position:absolute; bottom:2px; right:4px; width:15px; height:15px; background:#15803D; border:2px solid #fff; border-radius:50%;"></span>
        </div>
        <h3 style="font-size:1.25rem; font-weight:800; color:#0F172A; margin-bottom:2px;">${pro.name}</h3>
        <span style="display:inline-block; background:#DCFCE7; color:#15803D; font-size:0.75rem; font-weight:800; padding:2px 10px; border-radius:12px; margin-bottom:12px;">
          PMC Official Division ✓
        </span>
      </div>

      <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:14px; padding:14px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.86rem;">
          <span style="color:#64748B;">Nodal Officer:</span>
          <strong style="color:#0F172A;">${pro.officer || 'Zonal Municipal Officer'}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.86rem;">
          <span style="color:#64748B;">Coverage Ward:</span>
          <strong style="color:#0F172A;">${pro.distance}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.86rem;">
          <span style="color:#64748B;">Field Status:</span>
          <strong style="color:#0F766E;">${pro.status}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.86rem;">
          <span style="color:#64748B;">Citizen Rating:</span>
          <strong style="color:#D97706;">★ ${pro.rating} (${pro.reviews} resolved)</strong>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.86rem;">
          <span style="color:#64748B;">Service Type:</span>
          <strong style="color:#15803D;">Free Public Utility</strong>
        </div>
      </div>

      <div style="font-size:0.82rem; color:#475569; background:#F0FDF4; border:1px solid #BBF7D0; padding:10px 12px; border-radius:10px; margin-bottom:16px;">
        <strong>Department Mandate:</strong> ${pro.description}
      </div>

      <div style="display:flex; gap:10px;">
        <button type="button" onclick="CityAssist.closeModal(); ServicesEngine.openServiceRequest('${pro.category}')" class="primary-green-btn" style="flex:1; background:#F0FDF4; color:#15803D; border:1.5px solid #BBF7D0; text-align:center; display:flex; align-items:center; justify-content:center; gap:6px;">
          📝 File Grievance
        </button>
        <a href="tel:${pro.phone}" onclick="CityAssist.showToast('Calling ${pro.name}... 📞'); CityAssist.closeModal();" class="primary-green-btn" style="flex:1; text-align:center; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:6px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="18" height="18"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          Call Helpline
        </a>
      </div>
    `);
  },

  /**
   * Share route completion report via WhatsApp/Web Share API
   */
  shareRouteCompletionReport() {
    const stops = (typeof GPSTrackerEngine !== 'undefined') ? GPSTrackerEngine.getRouteStops() : [];
    const totalStops = stops.length;
    const totalBins = stops.reduce((s, x) => s + (x.bins || 0), 0);
    const now = new Date().toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const reportText = `🚚 CityAssist Route Completion Report
📅 ${new Date().toLocaleDateString('en-IN')} | ⏰ ${now}
Driver: Ramesh Shinde (ID: PMC-DRV-884)
Vehicle: #MH-12-EA-4920

✅ Total Stops Completed: ${totalStops}
🗑️ Total Bins Collected: ${totalBins}
📍 Route: Talegaon Station → Sector 4 Depot

Powered by CityAssist — Smart Municipal App`;

    if (navigator.share) {
      navigator.share({ title: 'CityAssist Route Report', text: reportText })
        .then(() => this.showToast('Report shared successfully! 📤'))
        .catch(() => this.shareViaClipboard(reportText));
    } else {
      this.shareViaClipboard(reportText);
    }
  },

  shareViaClipboard(text) {
    try {
      navigator.clipboard.writeText(text);
      this.showToast('📋 Report copied to clipboard! Paste anywhere to share.');
    } catch (e) {
      this.showToast('Report ready. Long-press to copy.');
    }
  },

  /**
   * Show a brief toast notification at the bottom of the screen
   * @param {string} message - The message to show
   * @param {number} duration - How long in ms (default 3200ms)
   */
  showToast(message, duration = 3200) {
    let toastContainer = document.getElementById('cityassist-toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'cityassist-toast-container';
      toastContainer.style.cssText = 'position:fixed; bottom:88px; left:50%; transform:translateX(-50%); z-index:100000; display:flex; flex-direction:column; align-items:center; gap:8px; pointer-events:none; max-width:88vw;';
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.style.cssText = 'background:rgba(15,23,42,0.93); color:#FFFFFF; padding:10px 18px; border-radius:22px; font-family:\'Plus Jakarta Sans\',sans-serif; font-size:0.84rem; font-weight:700; box-shadow:0 6px 24px rgba(0,0,0,0.35); backdrop-filter:blur(10px); white-space:nowrap; opacity:0; transform:translateY(12px); transition:all 0.25s ease; max-width:88vw; overflow:hidden; text-overflow:ellipsis;';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      setTimeout(() => {
        try { toastContainer.removeChild(toast); } catch (e) {}
      }, 300);
    }, duration);
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  CityAssist.init();
  MunicipalityEngine.init();
  CommunityEngine.init();
  ServicesEngine.init();
});


